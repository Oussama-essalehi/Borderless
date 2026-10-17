/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// Relative base so the build works at a domain root or in a sub-folder.
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
