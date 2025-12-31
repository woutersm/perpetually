import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_akmuduuuhsbvmcgzqxxp",
  dirs: ["./src/trigger"],
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  maxDuration: 300, // 5 minutes max
});
