/// <reference types="vitest" />

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleThread: true,
      },
    },
    setupFiles: ["./vitest.setup.ts"],
  },
});
