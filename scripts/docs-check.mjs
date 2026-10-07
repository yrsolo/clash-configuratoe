import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const requiredPaths = [
  "readme.md",
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
  "serverless/README.md",
  "docs/reference/handover.md",
  "docs/reference/yandex-registration.md",
  "docs/reference/yandex-deploy.md",
  "docs/reference/starter-configuration.md",
  "docs/reference/operations.md",
  "docs/reference/clients/README.md",
  "docs/reference/clients/windows.md",
  "docs/reference/clients/macos.md",
  "docs/reference/clients/android.md",
  "docs/reference/clients/ios.md",
  "default/new.json",
  "deploy/yandex/gateway.openapi.template.yaml"
];

const missing = [];

for (const file of requiredPaths) {
  try {
    await access(path.resolve(root, file));
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

const skipped = new Set(["node_modules", "dist", ".git", ".playwright-cli", "test-results", "coverage", "tmp", "generated"]);
const markdownFiles = [];
const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && !skipped.has(entry.name)) await walk(file);
    else if (entry.isFile() && entry.name.endsWith(".md")) markdownFiles.push(file);
  }
};
await walk(root);
const broken = [];
let checkedLinks = 0;
for (const file of markdownFiles) {
  const source = (await readFile(file, "utf8")).replace(/```[\s\S]*?```/g, "");
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, "");
    if (/^(https?:|mailto:|app:|codex:|#)/i.test(target)) continue;
    if (/^(\/|[a-z]:)/i.test(target)) {
      broken.push(`${path.relative(root, file)}: machine-specific link ${target}`);
      continue;
    }
    target = decodeURIComponent(target.split("#")[0]);
    if (!target) continue;
    try { await access(path.resolve(path.dirname(file), target)); checkedLinks++; }
    catch { broken.push(`${path.relative(root, file)}: missing ${target}`); }
  }
}
if (broken.length) {
  console.error(broken.join("\n"));
  process.exit(1);
}
console.log(`Documentation complete: ${markdownFiles.length} Markdown files, ${checkedLinks} local links checked.`);
