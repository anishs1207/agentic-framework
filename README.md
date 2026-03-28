# Agentic Ecosystem ⚡

> A powerful, extensible agentic ecosystem built in TypeScript — multi-agent orchestration, cron scheduling, tool plugins, session persistence, a rich terminal UI, and an intelligent **Image Memory System**. Powered by **Google Gemini**.

![alt text](/images/image.png)

---

## Project Overview

This repository has evolved into a comprehensive **Agentic Ecosystem**, consisting of two primary components:

1.  **AgenticCLI**: A feature-rich terminal interface for building, spawning, and orchestrating ReAct agents.
2.  **Image Memory System**: A NestJS-powered backend and Next.js frontend for analyzing, indexing, and interacting with visual memories using Vision-Language Models (VLM).

---

## Quick Start (CLI)

```bash
git clone https://github.com/anishs1207/cli-agent
cd cli-agent
npm install
cp .env.sample .env        # add your GEMINI_API_KEY
npm run dev
```

Get a free API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

---

## Ecosystem Tooling (Taskfile)

We use [Task](https://taskfile.dev/) (via `Taskfile.yml`) to manage the various services in this ecosystem.

```bash
# Start all services (CLI, Image Memory Backend/Frontend/Docs, DB, Redis)
task up

# Run the Agent CLI locally
task cli

# Check service status
task status

# Stop all services
task down
```

---

## How It Works (AgenticCLI)

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
- Supports multiple memory strategies: Window, Buffer, and Summarizer.
- Configurable temperature, max iterations, persona/system prompt.
- Verbose mode shows every thought, action, and observation.

### 🖼️ Image Memory System (Sub-project)

Located in `/image-memory`, this system provides:
- **Image Ingestion & Analysis**: Automatic metadata extraction and scene description.
- **Identity Recognition**: Detects and identifies individuals across images.
- **Relationship Graph**: Builds a consensus-based model of relationships.
- **Neural Journals**: Generates daily summaries of encounters and events.
- **Interactive Chat**: A context-aware interface to query your visual memories.

### 👥 Multi-Agent Orchestration

Spawn multiple specialised agents from saved profiles and run them in **parallel**, **sequentially**, or in a **supervisor** pattern.

### ⏰ Cron Scheduler

Schedule any agent task or workflow to fire automatically on a repeating interval.

### 🔌 Plugin System

Drop compiled `.js` tool files into `./plugins/` for dynamic loading.

---

## Project Structure

```
.
├── src/                  # Core AgenticCLI source code
│   ├── index.ts          # Main REPL + command dispatcher
│   ├── core/             # Agent engine, memory, tools, etc.
│   ├── tools/            # Built-in tool implementations
│   └── cli/              # CLI UI, renderers, and bridges
├── image-memory/         # Image Memory System sub-project
│   ├── backend/          # NestJS API
│   ├── frontend/         # Next.js UI
│   └── docs/             # Documentation for the memory system
├── agents/               # Saved agent profiles and workflows
├── k8s/                  # Kubernetes manifests (CLI, Backend, Frontend)
├── plugins/              # Dynamic tool plugins (.js)
├── sessions/             # Saved CLI sessions
├── traces/               # Execution trace logs (JSON)
├── Taskfile.yml          # Ecosystem orchestration tasks
├── docker-compose.yml    # Container definitions
└── GEMINI.md             # Agent behavior and project rules
```

---

## Environment Variables

```env
GEMINI_API_KEY=your_key_here        # required
TELEGRAM_BOT_TOKEN=your_token       # optional, for /telegram
WHATSAPP_SESSION_PATH=./ww          # optional, WhatsApp session dir
```

---

## All Commands Reference (CLI)

| Group | Command | Description |
|---|---|---|
| **Core** | `/tools`, `/memory`, `/clear`, `/verbose`, `/stats`, `/trace` | Basic agent control |
| **Model** | `/model <name>`, `/temperature <n>`, `/persona <text>` | Model configuration |
| **Library** | `/prompts`, `/prompt <name>`, `/prompt-save <name>` | Prompt management |
| **Sessions** | `/session-save`, `/session-list`, `/session-load` | State persistence |
| **Workflows** | `/workflow`, `/workflow-list`, `/workflow-run` | Pipeline automation |
| **Multi-Agent** | `/spawn`, `/agents`, `/ask`, `/swarm`, `/chain` | Orchestration |
| **Cron** | `/cron-add`, `/cron-list`, `/cron-run` | Scheduling |
| **Bridges** | `/telegram`, `/whatsapp`, `/events` | External interfaces |

---

## Tech Stack

- **CLI**: Node.js 20, TypeScript 5, Commander, Inquirer, Ora, Chalk.
- **Backend**: NestJS, Sharp (Image Processing).
- **Frontend**: Next.js (Tailwind/Radix UI).
- **LLM**: `@google/generative-ai` (Gemini-2.5-flash).
- **Infra**: Docker, Kubernetes (k8s), Taskfile.

---

*Last Updated: 2026-03-28*
