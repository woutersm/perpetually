/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from "vitest/config";
import path from "path";

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
    setupFiles: [path.resolve(__dirname, "../../packages/db/vitest.setup.ts")],
  },
});
