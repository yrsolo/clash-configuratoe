import { access } from "node:fs/promises";
import path from "node:path";

const requiredPaths = [
  "README.md",
  "AGENTS.md",
  "agent/OPERATING_CONTRACT.md",
  ".codex/skills/verify-docs-architecture/SKILL.md",
  ".codex/skills/trace-source-of-truth/SKILL.md",
  ".codex/skills/check-readme-role/SKILL.md",
  ".codex/skills/update-tracking/SKILL.md",
  ".codex/skills/run-tests/SKILL.md",
  ".codex/skills/prepare-release/SKILL.md",
  "docs/README.md",
  "docs/overview/product.md",
  "docs/overview/getting-started.md",
  "docs/overview/repository-map.md",
  "docs/architecture/README.md",
  "docs/architecture/ideal-principles.md",
  "docs/architecture/system-overview.md",
  "docs/architecture/frontend.md",
  "docs/architecture/data-model.md",
  "docs/architecture/integrations.md",
  "docs/process/README.md",
  "docs/process/documentation-governance.md",
  "docs/reference/env.md",
  "docs/reference/api.md",
  "docs/reference/config-format.md",
  "docs/reference/commands.md",
  "docs/reference/routes.md",
  "docs/process/agent-workflow.md",
  "work/now/README.md",
  "work/now/current-task.md",
  "work/now/plan.md",
  "work/now/evidence.md",
  "work/roadmap/README.md",
  "work/archive/README.md",
  "serverless/README.md"
];

const missing = [];

for (const file of requiredPaths) {
  try {
    await access(path.resolve(file));
  } catch {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error("Missing required docs:");
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("Documentation structure looks complete.");
