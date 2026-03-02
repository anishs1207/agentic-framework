# Agentic framework
- buildign an agentic rameokr
where you can speicufy tools
(basiic stuff -> like simple function code here)
- to call which tool how
- lancgian refer
- building in ts


# What LangChain Actually Is
- LangChain is basically:
- Prompt templating
- Tool abstraction
- Memory management
- Agent loop (ReAct-style reasoning)
- Output parsing
- Model wrapper abstraction


It’s just a loop that lets an LLM think, call tools, observe results, and think again.

```
LLM Wrapper
Tool Registry
Agent (ReAct Loop Engine)
Memory Store
Output Parser
Planner (optional)
```

```
High Level Flow
User Query
   ↓
LLM (Reasoning)
   ↓
Tool Call?
   ↓ Yes
Execute Tool
   ↓
Observation
   ↓
Back to LLM
   ↓
Final Answer
```

# ReAct Loop (Core Concept)
- ReAct = Reasoning + Acting
- ReAct: Synergizing Reasoning and Acting in Language Models
- The loop structure:
```
Thought: I should search weather
Action: search("weather in Delhi")
Observation: 32°C
Thought: Now I know temperature
Final Answer: It's 32°C
```

- Tool abstraction
- ReAct reasoning loop
- Scratchpad memory
- Output parsing
- Tool execution cycle

# TODO:

1. Memory System
- Vector store
- Conversation history
- Redis / DB persistence

2. Planner Agent
- Split into:
- Planner LLM
- Executor Agent

3. Structured Tool Calling:
- Function Calling
- Use OpenAI function schema style instead of regex parsing.

4. Multi-Agent System
- Like:
- Research Agent
- Code Agent

5. Advanced Upgrade: Planning + Execution

Plan:
1. Search weather
2. Convert temperature
