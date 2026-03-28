# Contributing to the Agentic Ecosystem

Thanks for taking the time to contribute! This project has grown into an ecosystem of agents and image memory services. This document covers everything you need to get started.

---

## Prerequisites

- **Node.js**: v20 or higher
- **Docker & Docker Compose**: For running the Image Memory system and DBs.
- **Task**: For orchestrating services (install via `npm install -g @go-task/cli` or your package manager).
- **Google Gemini API Key**: [Get one here](https://aistudio.google.com/apikey).

---

## Project Structure

```
.
├── src/                  # AgenticCLI (Core CLI)
├── image-memory/         # Image Memory System (Backend/Frontend)
├── k8s/                  # Kubernetes Manifests
├── plugins/              # Dynamic Tool Plugins
└── Taskfile.yml          # Ecosystem Orchestration
```

---

## Development Workflow

### 1. The Whole Ecosystem
To start everything for local development:
```bash
task up
```

To run only the CLI:
```bash
task cli
```

### 2. Feature Branches
1.  **Create a feature branch** off `main`:
    ```bash
    git checkout -b feat/your-feature-name
    ```

2.  **Make your changes** and verify TypeScript compiles:
    ```bash
    task typecheck
    ```

3.  **Run Linting**:
    ```bash
    task lint
    ```

4.  **Format your code**:
    ```bash
    npx font-prettier --write "**/*.ts"
    ```

5.  **Commit and push**, then open a Pull Request.

---

## Adding a New Tool (CLI)

All CLI tools live in `src/tools/`. Each tool is an instance of the `Tool` class exported from `src/core/tool.ts`.

```ts
import { Tool, z } from '../core/tool.js';

export const myTool = new Tool({
  name: 'myTool',
  description: 'What this tool does',
  inputDescription: 'Input format description',
  schema: z.object({ query: z.string() }),
  func: async ({ query }) => {
    return `Result for: ${query}`;
  },
});
```

Register your tool in `src/tools/index.ts` and `src/index.ts`.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `chore: ...`

---

## Pull Request Process

1. Ensure `task typecheck` and `task lint` pass.
2. Ensure code is formatted.
3. Provide a clear description of changes.
4. A maintainer will review your PR.

---

## Questions?

Open an [issue](https://github.com/anishs1207/agentic-cli/issues) or reach out to the maintainers. Happy hacking! 🚀

*Last Updated: 2026-03-28*
