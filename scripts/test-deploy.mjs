import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const shell = process.platform === "win32" ? "powershell" : "pwsh";
const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(shell, ["-NoProfile", "-File", "scripts/verify-deploy.ps1"], { cwd: root, stdio: "inherit" });
if (result.error) {
  console.error(`Deployment smoke test needs ${shell}. No cloud commands were executed.`);
  process.exit(1);
}
process.exit(result.status ?? 1);
