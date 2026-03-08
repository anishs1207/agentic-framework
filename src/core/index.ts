// Core module barrel export
export { Tool, ToolRegistry } from "./tool.js";
export type { ToolSchema } from "./tool.js";

export { LLM } from "./llm.js";
export type { LLMConfig } from "./llm.js";

export { Agent } from "./agent.js";
export type { AgentConfig, AgentResult } from "./agent.js";

export { ConversationBufferMemory, ConversationWindowMemory, SummarizerMemory } from "./memory.js";
export type { Message, MessageRole, BaseMemory, SummarizerMemoryOptions } from "./memory.js";

export { PromptTemplate, REACT_SYSTEM_PROMPT } from "./prompt.js";
export { parseReActOutput, isFinalAnswer, isToolCall } from "./parser.js";
export type { ParsedOutput } from "./parser.js";

export { Logger, logger } from "./logger.js";
export type { AgentCallbacks } from "./callbacks.js";

// New v2 exports
export { EventBus, globalBus, AgentEvents } from "./events.js";
export type { EventRecord } from "./events.js";

export { AgentProfileRegistry, agentProfileRegistry } from "./agent-registry.js";
export type { AgentProfile } from "./agent-registry.js";

export { AgentPool } from "./multi-agent.js";
export type { SpawnedAgent, MultiAgentTask, MultiAgentResult, SwarmResult } from "./multi-agent.js";

export { Scheduler, parseSchedule } from "./scheduler.js";
export type { CronJob } from "./scheduler.js";

// Session persistence
export { saveSession, loadSession, listSessions, deleteSession, generateSessionId } from "./session.js";
export type { SavedSession } from "./session.js";

// Prompt library
export { PromptLibrary, promptLibrary } from "./prompt-library.js";
export type { PromptEntry } from "./prompt-library.js";

// Execution tracer
export { ExecutionTracer } from "./tracer.js";
export type { AgentTrace, TraceStep } from "./tracer.js";

// Plugin loader
export { loadPlugins, listPluginFiles } from "./plugins.js";
export type { PluginLoadResult } from "./plugins.js";

