import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "playwright.config.ts"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
