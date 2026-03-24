import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/cli/**"],
      reporter: ["text", "json", "html"],
    },
  },
});
