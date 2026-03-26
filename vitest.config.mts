import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/.agents/**"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text", "json", "html"],
    },
  },
});
