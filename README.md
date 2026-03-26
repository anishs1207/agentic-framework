# AgenticCLI ⚡

> A powerful, extensible agentic framework built in TypeScript — multi-agent orchestration, cron scheduling, tool plugins, session persistence, and a rich terminal UI. Powered by **Google Gemini**.

![alt text](/images/image.png)


---

## Quick Start

```bash
git clone https://github.com/anishs1207/agentic-framework
cd agentic-framework
npm install
cp .env.sample .env        # add your GEMINI_API_KEY
npm run dev
```

Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

---

## How It Works

AgenticCLI implements the **ReAct** (Reason + Act) pattern — the same loop that powers LangChain agents and AutoGen:

```
User Query
   ↓
LLM thinks → "I should use the calculator tool"
   ↓
Action: calculator("12 * 8.5")
   ↓
Observation: "102"
   ↓
LLM thinks → "Now I have the answer"
   ↓
Final Answer: "12 × 8.5 = 102"
```

Each turn can use multiple tools across multiple iterations until a final answer is reached.

---

## Features

### 🧠 Core AI (ReAct Agent)

- **Gemini-powered** agent loop (works with any `gemini-*` model)
- Supports multiple memory strategies:
  - **Window memory** — keeps last N turns (default, 20 turns)
  - **Buffer memory** — full history
  - **Summarizer memory** — LLM-compressed summaries
- Configurable temperature, max iterations, persona/system prompt
- Verbose mode shows every thought, action, and observation

```
❯ You [gemini-2.5-flash] › What is the capital of France, and what time is it there?

  Thought: I need to find the current time in France.
  Action: getTime({})
  Observation: 2026-03-08T08:17:46Z (Europe/Paris: 09:17)
  Final Answer: The capital of France is Paris. The current time there is 09:17 AM.
```

---

### 🔧 Built-in Tools (11)

| Tool | What it does | Example input |
|---|---|---|
| `calculator` | Evaluate math expressions | `"(12 * 8.5) / 3"` |
| `weather` | Get current weather conditions | `"Tokyo"` |
| `getTime` | Current date/time in any timezone | `"America/New_York"` |
| `wikipedia` | Search and summarise Wikipedia | `"React.js library"` |
| `randomNumber` | Generate random numbers | `"1 100"` |
| `stringUtils` | String transforms (upper/lower/reverse/count) | `"upper hello world"` |
| `unitConverter` | Convert units (length/weight/temp) | `"72 fahrenheit to celsius"` |
| `currencyConverter` | Live currency conversion | `"100 USD to EUR"` |
| `fileSystem` | Read/write files in `./agent-workspace/` | `{"op":"write","filepath":"out.txt","content":"hello"}` |
| `httpFetch` | HTTP GET/POST to external APIs | `{"url":"https://api.github.com/repos/octocat/Hello-World"}` |
| `jsonTool` | Parse, query, and transform JSON | `{"op":"get","data":"...","path":"user.name"}` |

---

### 👥 Multi-Agent Orchestration

Spawn multiple specialised agents from saved profiles and run them in **parallel**, **sequentially**, or in a **supervisor** pattern.

#### Agent Profiles

```bash
/profile-create          # interactive wizard
/profiles                # list all profiles (table view)
/profile-delete <id>
```

Three presets are seeded automatically: **Researcher**, **Maths**, **DataAgent**.

#### Spawn & Control

```bash
/spawn Researcher        # create a live Researcher agent
/spawn DataAgent         # create a DataAgent
/agents                  # see status table of all active agents
/terminate Researcher    # kill an agent
```

#### Talk to Agents

```bash
# Ask one agent
/ask DataAgent fetch the stats from https://api.github.com/repos/octocat/Hello-World

# Run ALL agents on the same task simultaneously (parallel)
/swarm What is the current price of Bitcoin in USD?

# Run agents in sequence — each gets the previous output as context
/chain Research the history of the Eiffel Tower, then summarise it in 3 bullet points
```

---

### ⏰ Cron Scheduler

Schedule any agent task or workflow to fire automatically on a repeating interval — without restarting the CLI.

```bash
/cron-add                # interactive setup wizard
/cron-list               # table: name, schedule, status, run count, next fire
/cron-remove daily-brief
/cron-enable daily-brief
/cron-disable daily-brief
/cron-run daily-brief    # trigger immediately
```

**Example — daily briefing every morning:**
```
Name:     morning-brief
Type:     agent
Task:     What are the top 3 headlines in tech today?
Schedule: every 24h
```

**Schedule syntax:**
```
every 30s      every 5m / every 5min
every 2h       every 1d / daily
hourly         (minimum: 10 seconds)
```

---

### 📋 Prompt Library

10+ built-in named personas. Activate any with one command.

```bash
/prompts                 # list all (table: name, category, description)
/prompts coding          # search by keyword
/prompt analyst          # set "Sharp data analyst" persona
/prompt coder            # set "Expert software engineer" persona
/prompt-save my-prompt   # save current /persona as a named prompt
```

**Built-in prompts:**

| Name | Category | What it does |
|---|---|---|
| `analyst` | Professional | Structured thinking, asks clarifying questions |
| `coder` | Development | Clean code, explains trade-offs, mentions edge cases |
| `researcher` | Knowledge | Cites sources, multiple perspectives, academic style |
| `teacher` | Education | Analogies, step-by-step, adjusts to learner level |
| `planner` | Productivity | Phase plans, milestones, risks, time estimates |
| `critic` | Review | Honest, direct feedback with actionable suggestions |
| `debugger` | Development | Hypothesise → isolate → fix → prevent |
| `brainstorm` | Creativity | Divergent thinking, quantity over quality |
| `concise` | Style | Ultra-brief, zero fluff |
| `socratic` | Education | Guides through questions, never gives direct answers |

```bash
❯ You [gemini-2.5-flash] [PERSONA] › explain binary search

  ## Binary Search

  **The analogy**: think of a phone book. You don't start at page 1...
  1. Open to the **middle page**
  2. Is your name before or after the midpoint?
  ...
```

---

### 💾 Session Persistence

Save and restore complete sessions — memory, model, temperature, persona, and aliases all included.

```bash
/session-save research-session        # snapshot everything to ./sessions/
/session-list                         # table of all saved sessions
/session-load research-session        # restore memory + all settings
/session-delete research-session
```

**Example workflow:**
```bash
# Monday — research session
/prompt researcher
Tell me everything about transformer architecture
/session-save transformer-research

# Tuesday — pick up exactly where you left off
/session-load transformer-research
Continue — what are the limitations of attention mechanisms?
```

---

### ⚡ Workflows

Build and save multi-step agentic pipelines.

```bash
/workflow                # interactive builder
/workflow-list           # list saved workflows
/workflow-run report     # run workflow named "report"
```

**Example workflow — research + summarise + save:**
```
Step 1: Search Wikipedia for "large language models"
Step 2: Summarise in 5 bullet points
Step 3: Save the summary to a file called llm-summary.txt
```

Workflows can also be scheduled via `/cron-add`.

---

### 🔌 Plugin System

Drop compiled `.js` tool files into `./plugins/` — they're auto-loaded at startup or on demand.

```bash
/plugin-list             # show .js files in ./plugins/
/plugin-reload           # hot-reload without restarting
```

**Plugin format** (`plugins/myTool.js`):
```js
import { Tool } from "../src/core/tool.js";

const myTool = new Tool({
  name: "myTool",
  description: "Does something custom",
  inputDescription: "string input",
  func: async (input) => `Result: ${input}`,
});

export default myTool;
```

---

### 📦 Batch Mode

Run a text file of queries non-interactively — great for benchmarking or automation:

```bash
/batch queries.txt
```

`queries.txt`:
```
# Lines starting with # are skipped
What is 2^32?
What is the weather in London?
Summarise the Wikipedia article on quantum computing
```

Output shows a progress counter and rendered answers for each query.

---

### 🔍 Execution Tracer

Toggle detailed per-step execution traces, saved as JSON to `./traces/`:

```bash
/trace          # toggle on/off (shown as [TRACE] pill in prompt)
```

Each trace captures:
- Per-step timing (ms)
- Approximate token counts
- Thought, action, observation for every iteration
- Total duration and tools used

---

### ⚡ Aliases

Create shortcuts for frequently used command sequences:

```bash
/alias-set /r /cron-run morning-brief    # /r now triggers that cron job
/alias-set /ss /swarm                    # shorter /swarm
/aliases                                 # list all aliases
/alias-remove /r
```

---

### 📊 Session Stats

```bash
/stats          # full dashboard
```

Shows: model, temperature, uptime, total queries, iterations, tool calls, average response time, errors, and a **bar chart** of tool usage.

---

### 📡 Messaging Bridges

#### Telegram
```bash
/telegram           # start bot (requires TELEGRAM_BOT_TOKEN in .env)
/stop-telegram
```

#### WhatsApp
```bash
/whatsapp           # scan QR code to connect
/stop-whatsapp
```

Once connected, messages sent to the bot are processed by the main agent and replies are sent back automatically.

---

### 🎛️ Core Configuration Commands

```bash
/model gemini-2.0-flash-exp    # switch model mid-session
/temperature 0.2               # lower = more deterministic
/persona You are a pirate...   # custom system prompt
/verbose                       # toggle thought/action logging
/memory                        # show current conversation context
/clear                         # wipe memory and start fresh
/export session.md             # export conversation to file
```

---

### 📡 Event Bus

The entire system publishes typed events — useful for debugging and building reactive integrations:

```bash
/events 30      # show last 30 events (table: time, type, source, payload)
```

Events include: `agent:started`, `agent:completed`, `tool:called`, `workflow:done`, `cron:fired`, etc.

---

## Project Structure

```
src/
├── index.ts              # Main REPL + command dispatcher
├── core/
│   ├── agent.ts          # ReAct loop engine
│   ├── llm.ts            # Gemini wrapper with retry
│   ├── memory.ts         # Buffer / Window / Summarizer memory
│   ├── tool.ts           # Tool base class + ToolRegistry (Zod validation)
│   ├── prompt.ts         # PromptTemplate + REACT_SYSTEM_PROMPT
│   ├── parser.ts         # ReAct output parser
│   ├── callbacks.ts      # Agent lifecycle hooks
│   ├── logger.ts         # Styled terminal logger
│   ├── events.ts         # Typed EventBus (pub/sub)
│   ├── agent-registry.ts # Named agent profiles (persisted)
│   ├── multi-agent.ts    # AgentPool (parallel/sequential/supervisor)
│   ├── scheduler.ts      # Cron job scheduler
│   ├── session.ts        # Session save/load
│   ├── prompt-library.ts # 10 built-in named prompts + custom
│   ├── tracer.ts         # Execution trace recorder
│   └── plugins.ts        # Dynamic plugin loader
├── tools/
│   ├── calculator.ts
│   ├── weather.ts
│   ├── getTime.ts
│   ├── wikipedia.ts
│   ├── randomNumber.ts
│   ├── stringUtils.ts
│   ├── unitConverter.ts
│   ├── currencyConverter.ts
│   ├── fileSystem.ts     # Sandboxed ./agent-workspace/
│   ├── httpFetch.ts      # HTTP GET/POST/PUT/DELETE
│   └── jsonTool.ts       # JSON parse/query/transform
└── cli/
    ├── ui.ts             # Banner, help, stats, tool cards
    ├── renderer.ts       # ASCII tables, Markdown renderer, token estimator
    ├── workflow.ts       # Workflow builder and runner
    ├── telegram.ts       # Telegram bridge
    └── whatsapp.ts       # WhatsApp bridge
```

---

## Environment Variables

```env
GEMINI_API_KEY=your_key_here        # required
TELEGRAM_BOT_TOKEN=your_token       # optional, for /telegram
WHATSAPP_SESSION_PATH=./ww          # optional, WhatsApp session dir
```

---

## Extending with a Custom Tool

```typescript
// src/tools/myTool.ts
import { Tool } from "../core/tool.js";
import { z } from "zod";

export const myTool = new Tool({
  name: "myTool",
  description: "Describe what the tool does for the agent",
  inputDescription: "A plain-English string describing what to pass",
  schema: z.object({ query: z.string() }),
  func: async (input) => {
    // input is validated + typed by Zod
    return `Result for: ${input.query}`;
  },
  examples: ["example input 1", "example input 2"],
});
```

Then register it in `src/tools/index.ts` and `src/index.ts`.

---

## All Commands Reference

| Group | Command | Description |
|---|---|---|
| **Core** | `/tools` | List all registered tools |
| | `/memory` | Show conversation history |
| | `/clear` | Wipe memory |
| | `/verbose` | Toggle thought/action logging |
| | `/model <name>` | Switch Gemini model |
| | `/temperature <n>` | Set LLM temperature (0–2) |
| | `/persona <text>` | Custom system prompt |
| | `/stats` | Session statistics dashboard |
| | `/export [file]` | Export conversation to file |
| | `/trace` | Toggle execution tracer |
| **Prompt Library** | `/prompts [query]` | List / search 10+ built-in prompts |
| | `/prompt <name>` | Activate a named prompt as persona |
| | `/prompt-save <name>` | Save current persona to library |
| **Sessions** | `/session-save <name>` | Snapshot session to disk |
| | `/session-list` | List saved sessions |
| | `/session-load <name>` | Restore a saved session |
| | `/session-delete <name>` | Delete a session |
| **Aliases** | `/alias-set /x /cmd` | Create a command shortcut |
| | `/aliases` | List all aliases |
| | `/alias-remove /x` | Remove an alias |
| **Batch & Plugins** | `/batch <file>` | Run queries from file |
| | `/plugin-list` | List plugins in `./plugins/` |
| | `/plugin-reload` | Hot-reload plugins |
| **Workflows** | `/workflow` | Interactive workflow builder |
| | `/workflow-list` | List saved workflows |
| | `/workflow-run <n>` | Run workflow by name |
| **Multi-Agent** | `/profiles` | List agent profiles |
| | `/profile-create` | Create a new profile |
| | `/profile-delete <id>` | Delete a profile |
| | `/spawn <profile>` | Spawn an agent |
| | `/agents` | List active agents |
| | `/terminate <name>` | Kill an agent |
| | `/ask <agent> <msg>` | Message a specific agent |
| | `/swarm <task>` | Parallel agents on same task |
| | `/chain <msg>` | Sequential chained agents |
| **Cron** | `/cron-add` | Add scheduled job |
| | `/cron-list` | List jobs + status |
| | `/cron-remove <name>` | Remove job |
| | `/cron-enable/disable` | Toggle job |
| | `/cron-run <name>` | Trigger immediately |
| **Events & Bridges** | `/events [n]` | Event bus history |
| | `/telegram` | Start Telegram bot |
| | `/stop-telegram` | Stop Telegram bot |
| | `/whatsapp` | Start WhatsApp bridge |
| | `/stop-whatsapp` | Stop WhatsApp bridge |
| **Session** | `/help` | This help |
| | `/exit` | Exit |

---

## Tech Stack

- **Runtime**: Node.js 20, TypeScript 5
- **LLM**: `@google/generative-ai` (Gemini)
- **Validation**: `zod`
- **UI**: `chalk`, `boxen`, `figlet`, `ora`
- **Bridges**: `whatsapp-web.js`, `node-telegram-bot-api`
- **Config**: `dotenv`
