import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import { 
  saveWorkflow, loadWorkflows, listWorkflows, loadWorkflowByName, buildWorkflow, type Workflow 
} from "../src/cli/workflow.js";
import { 
  ToolRegistry, 
  Agent, 
} from "../src/core/index.js";
import * as readline from "readline";

// Mock the whole 'fs' module
vi.mock("fs");
vi.mock("inquirer");

describe("Workflow Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it("saveWorkflow should call fs.writeFileSync", () => {
    const wf: Workflow = {
      name: "Test flow",
      description: "A test description",
      steps: [{ type: "agent", instruction: "test prompt", chainOutput: true }],
      createdAt: new Date().toISOString()
    };

    saveWorkflow(wf);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("test-flow.json"),
        expect.stringContaining("Test flow")
    );
  });

  it("loadWorkflows should list and parse workflow files", () => {
    vi.mocked(fs.readdirSync).mockReturnValue(["flow-1.json", "flow-2.json"] as unknown as string[]);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ 
      name: "Mock Workflow", 
      steps: [], 
      createdAt: "" 
    }));

    const workflows = loadWorkflows();
    expect(workflows.length).toBe(2);
    expect(workflows[0].name).toBe("Mock Workflow");
  });

  it("loadWorkflowByName should find a workflow", () => {
    vi.mocked(fs.readdirSync).mockReturnValue(["flow-1.json"] as unknown as string[]);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ name: "Flow 1", steps: [], createdAt: "" }));
    
    const workflow = loadWorkflowByName("Flow 1");
    expect(workflow?.name).toBe("Flow 1");
  });

  it("listWorkflows should log workflow cards", () => {
    vi.mocked(fs.readdirSync).mockReturnValue(["flow-1.json"] as unknown as string[]);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ 
      name: "Flow 1", 
      steps: [{ type: "agent", instruction: "test" }], 
      description: "desc" 
    }));
    vi.spyOn(console, "log").mockImplementation(() => {});
    
    listWorkflows();
    expect(console.log).toHaveBeenCalled();
  });

  it("buildWorkflow should interact with user and return a workflow", async () => {
    let callCount = 0;
    const answers = [
      "New Flow",      // name
      "Desc",          // description
      "agent",         // step 1 type
      "do something",  // step 1 prompt
      "y",             // chain step 1
      "done",          // finish
      "y"              // save
    ];
    
    const dummyRl = { 
      question: vi.fn((q, cb) => {
        cb(answers[callCount++]);
      }),
      close: vi.fn()
    } as unknown as readline.Interface;
    const dummyRegistry = { listNames: () => ["tool1"] } as unknown as ToolRegistry;
    
    const wf = await buildWorkflow(dummyRl, dummyRegistry);
    expect(wf?.name).toBe("New Flow");
    expect(wf?.steps.length).toBe(1);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it("should handle error in workflow step", async () => {
    const wf: Workflow = {
      name: "Fail Flow",
      description: "desc",
      steps: [{ type: "agent", instruction: "task", chainOutput: true }],
      createdAt: ""
    };
    const agent = { run: vi.fn().mockRejectedValue(new Error("Step failed")) };
    const registry = { has: () => true, get: () => ({ run: () => "tool response" }) };
    
    const { runWorkflow } = await import("../src/cli/workflow.js");
    vi.spyOn(console, "log").mockImplementation(() => {});
    await runWorkflow(wf, agent as unknown as Agent, registry as unknown as ToolRegistry);
    
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Step failed"));
  });

  it("should return early if name is empty in loadWorkflowByName", () => {
    const result = loadWorkflowByName("");
    expect(result).toBeUndefined();
  });

  it("should handle existing workflows directory in ensureWorkflowsDir", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    saveWorkflow({ name: "test", steps: [], createdAt: "", description: "" });
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
});
