# Contributing to Agentic Framework

Thanks for taking the time to contribute! This document covers everything you need to get started.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Adding a New Tool](#adding-a-new-tool)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher

### Setup

```bash
# Clone the repo
git clone https://github.com/anishs1207/agentic-framework.git
cd agentic-framework

# Install dependencies
npm install

# Copy the environment sample and fill in your API keys
cp .env.sample .env
```

### Running the agent

```bash
npm run dev
```

---

## Project Structure

```
src/
├── core/
│   ├── agent.ts        # ReAct loop — the heart of the framework
│   ├── callbacks.ts    # Lifecycle hooks (onToolCall, onThought, etc.)
│   ├── llm.ts          # Gemini LLM wrapper
│   ├── logger.ts       # Coloured console logger
│   ├── memory.ts       # Conversation / scratchpad memory
│   ├── parser.ts       # LLM output parser (Thought / Action / Answer)
│   ├── prompt.ts       # System prompt builder
│   └── tool.ts         # Tool class, ToolRegistry, Zod validation helpers
└── tools/
    ├── calculator.ts
    ├── getTime.ts
    ├── randomNumber.ts
    ├── stringUtils.ts
    ├── weather.ts
    └── wikipedia.ts
```

---

## Development Workflow

1. **Create a feature branch** off `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** and verify TypeScript compiles without errors:
   ```bash
   npx tsc --noEmit
   ```

3. **Run the agent** to do a quick end-to-end sanity check:
   ```bash
   npm run dev
   ```

4. **Format your code** with Prettier:
   ```bash
   npx prettier --write "src/**/*.ts"
   ```

5. **Commit and push**, then open a Pull Request.

---

## Adding a New Tool

All tools live in `src/tools/`. Each tool is an instance of the `Tool` class exported from `src/core/tool.ts`.

### Minimal example (plain string input)

```ts
// src/tools/myTool.ts
import { Tool } from '../core/tool.js';

export const myTool = new Tool({
  name: 'myTool',
  description: 'One-line description of what this tool does',
  inputDescription: 'What to pass in',
  examples: ['example input'],
  func: async (input: string) => {
    return `Result: ${input}`;
  },
});
```

### Recommended: add a Zod schema for structured input

```ts
// src/tools/myTool.ts
import { Tool, z } from '../core/tool.js';

const myToolSchema = z.object({
  value: z.string().min(1, 'value must not be empty').describe('The value to process'),
});

export const myTool = new Tool({
  name: 'myTool',
  description: 'One-line description of what this tool does',
  inputDescription: 'JSON object with a "value" field (e.g. {"value": "hello"})',
  examples: ['{"value": "hello"}'],
  inputSchema: myToolSchema,       // <-- Zod validates before func is called
  func: async ({ value }) => {
    return `Result: ${value}`;
  },
});
```

When `inputSchema` is provided:
- The raw string from the LLM is **JSON-parsed** first.
- The parsed object is **validated against the Zod schema**.
- On failure, a clear human-readable error is returned — `func` is never called.

### Register your tool

Open `src/tools/index.ts` and export your new tool, then register it in `src/index.ts` (or wherever the `ToolRegistry` is assembled).

---

## Code Style

- **TypeScript strict mode** — no implicit `any`, no unused variables.
- **Prettier** is configured in `.prettierrc` — run `npx prettier --write "src/**/*.ts"` before committing.
- Use `z` (re-exported from `src/core/tool.ts`) for all Zod schemas — no need to import zod directly in tool files.
- Prefer `async/await` over raw Promises.
- Keep tool functions focused — one tool, one job.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add wikipedia tool with Zod schema
fix: handle empty expression in calculator tool
refactor: extract formatZodIssues into core/tool.ts
docs: update README with tool usage examples
chore: add .prettierrc config
```

---

## Pull Request Process

1. Ensure `npx tsc --noEmit` passes with zero errors.
2. Make sure your code is formatted (`npx prettier --check "src/**/*.ts"`).
3. Write a clear PR description — what changed and why.
4. Link any related issues in the PR body.
5. A maintainer will review and merge once everything looks good.

---

## Questions?

Open an [issue](https://github.com/anishs1207/agentic-framework/issues) and tag it with `question`. Happy hacking! 🚀
