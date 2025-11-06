// Re-export seed from shared package
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedProcess = spawn("tsx", [path.join(__dirname, "../packages/db/seed.ts")], {
  stdio: "inherit",
});

seedProcess.on("error", (error) => {
  console.error("Failed to run seed:", error);
  process.exit(1);
});

seedProcess.on("exit", (code) => {
  process.exit(code ?? 0);
});
