import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.resolve(root, process.argv[2] ?? "deploy/yandex/gateway.local.yaml");
const values = {
  FUNCTION_ID: process.env.YC_FUNCTION_ID,
  GATEWAY_SERVICE_ACCOUNT_ID: process.env.YC_GATEWAY_SERVICE_ACCOUNT_ID,
  FRONTEND_BUCKET: process.env.YC_FRONTEND_BUCKET
};
for (const [name, value] of Object.entries(values)) {
  if (!value || !/^[a-z0-9][a-z0-9.-]*$/.test(value) || value.includes("replace-me")) {
    throw new Error(`Set a valid deployment value for ${name}.`);
  }
}
let spec = await readFile(path.join(root, "deploy/yandex/gateway.openapi.template.yaml"), "utf8");
for (const [name, value] of Object.entries(values)) spec = spec.replaceAll(`__${name}__`, value);
if (/__[A-Z_]+__/.test(spec)) throw new Error("Gateway template contains unresolved placeholders.");
await writeFile(output, spec);
console.log(`Gateway specification written: ${path.relative(root, output)}`);
