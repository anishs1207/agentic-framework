// ──────────────────────────────────────────────────────────────────────────────
// Multi-Agent Orchestration
// Supports: parallel agent execution, sequential chaining, supervisor pattern
// ──────────────────────────────────────────────────────────────────────────────

import { Agent, AgentConfig, AgentResult } from "./agent.js";
import { LLM } from "./llm.js";
import { ToolRegistry } from "./tool.js";
import { ConversationWindowMemory } from "./memory.js";
import { AgentProfile } from "./agent-registry.js";
import { globalBus, AgentEvents } from "./events.js";
import { logger } from "./logger.js";

export interface SpawnedAgent {
  id: string;
  name: string;
  profile: AgentProfile;
  agent: Agent;
  status: "idle" | "running" | "done" | "error";
  lastResult?: AgentResult;
  createdAt: Date;
}

export interface MultiAgentTask {
  agentId: string;
  input: string;
}

export interface MultiAgentResult {
  agentId: string;
  agentName: string;
  result?: AgentResult;
  error?: string;
  durationMs: number;
}

export interface SwarmResult {
  results: MultiAgentResult[];
  finalSynthesis?: string;
  totalDurationMs: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Agent Pool — manages a collection of spawned agents
// ──────────────────────────────────────────────────────────────────────────────
export class AgentPool {
  private agents: Map<string, SpawnedAgent> = new Map();
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** Spawn a new agent from a profile */
  spawn(profile: AgentProfile, allTools: ToolRegistry): SpawnedAgent {
    const id = `${profile.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    // Build a filtered registry if profile specifies tools
    let registry = allTools;
    if (profile.tools.length > 0) {
      registry = new ToolRegistry();
      for (const name of profile.tools) {
        const tool = allTools.get(name);
        if (tool) (registry as ToolRegistry).tools.set(name, tool);
      }
    }

    const llm = new LLM({
      apiKey: this.apiKey,
      modelName: profile.model,
      temperature: profile.temperature,
      maxRetries: 3,
      retryDelayMs: 2000,
    });

    const memory = new ConversationWindowMemory(10);

    const agentConfig: AgentConfig = {
      llm,
      tools: registry,
      memory,
      maxIterations: profile.maxIterations,
      verbose: false,
    };

    const agent = new Agent(agentConfig);

    const spawned: SpawnedAgent = {
      id,
      name: profile.name,
      profile,
      agent,
      status: "idle",
      createdAt: new Date(),
    };

    this.agents.set(id, spawned);

    globalBus.emitSync(AgentEvents.AGENT_CREATED, {
      agentId: id,
      name: profile.name,
      role: profile.role,
    });

    logger.info(`🤖 Spawned agent "${profile.name}" (${id})`);
    return spawned;
  }

  /** Get a spawned agent by id or name */
  get(idOrName: string): SpawnedAgent | undefined {
    return (
      this.agents.get(idOrName) ??
      [...this.agents.values()].find(
        (a) => a.name.toLowerCase() === idOrName.toLowerCase()
      )
    );
  }

  list(): SpawnedAgent[] {
    return [...this.agents.values()];
  }

  terminate(idOrName: string): boolean {
    const spawned = this.get(idOrName);
    if (!spawned) return false;
    this.agents.delete(spawned.id);
    logger.info(`💀 Terminated agent "${spawned.name}" (${spawned.id})`);
    return true;
  }

  // ── Execution modes ─────────────────────────────────────────────────────────

  /** Run a single spawned agent */
  async runOne(idOrName: string, input: string): Promise<MultiAgentResult> {
    const spawned = this.get(idOrName);
    if (!spawned) {
      return { agentId: idOrName, agentName: idOrName, error: "Agent not found", durationMs: 0 };
    }

    spawned.status = "running";
    globalBus.emitSync(AgentEvents.AGENT_STARTED, { agentId: spawned.id, input });
    const t0 = Date.now();

    try {
      const result = await spawned.agent.run(input);
      spawned.status = "done";
      spawned.lastResult = result;
      globalBus.emitSync(AgentEvents.AGENT_COMPLETED, {
        agentId: spawned.id,
        output: result.output,
      });
      return { agentId: spawned.id, agentName: spawned.name, result, durationMs: Date.now() - t0 };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      spawned.status = "error";
      globalBus.emitSync(AgentEvents.AGENT_ERROR, { agentId: spawned.id, error: errMsg });
      return {
        agentId: spawned.id,
        agentName: spawned.name,
        error: errMsg,
        durationMs: Date.now() - t0,
      };
    }
  }

  /**
   * Run multiple agents IN PARALLEL on different tasks
   * Returns all results once all agents complete
   */
  async runParallel(tasks: MultiAgentTask[]): Promise<MultiAgentResult[]> {
    return Promise.all(tasks.map((t) => this.runOne(t.agentId, t.input)));
  }

  /**
   * Run agents SEQUENTIALLY, optionally chaining output of one to the next
   */
  async runSequential(
    tasks: MultiAgentTask[],
    chain = false
  ): Promise<MultiAgentResult[]> {
    const results: MultiAgentResult[] = [];
    let carry = "";

    for (const task of tasks) {
      const input = chain && carry ? `Context from previous agent:\n${carry}\n\nTask: ${task.input}` : task.input;
      const result = await this.runOne(task.agentId, input);
      results.push(result);
      carry = result.result?.output ?? result.error ?? "";
    }

    return results;
  }

  /**
   * Supervisor pattern: a "supervisor" agent breaks down the task, dispatches
   * sub-agents, then synthesises the final answer.
   */
  async runWithSupervisor(
    supervisorId: string,
    workerTasks: MultiAgentTask[],
    finalPassQuestion: string
  ): Promise<SwarmResult> {
    const t0 = Date.now();

    logger.info("🧑‍💼 Supervisor dispatching worker agents in parallel…");
    const workerResults = await this.runParallel(workerTasks);

    // Compile worker outputs for supervisor synthesis
    const compilation = workerResults
      .map((r) => `[${r.agentName}]: ${r.result?.output ?? r.error ?? "(no output)"}`)
      .join("\n\n");

    const synthesisInput = `You are a supervisor agent. Below are results from your worker agents.\n\n${compilation}\n\n${finalPassQuestion}`;
    const supervisorResult = await this.runOne(supervisorId, synthesisInput);

    return {
      results: [...workerResults, supervisorResult],
      finalSynthesis: supervisorResult.result?.output,
      totalDurationMs: Date.now() - t0,
    };
  }
}
