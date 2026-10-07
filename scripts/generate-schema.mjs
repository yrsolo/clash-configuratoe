import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { configProjectSchema } from "../packages/schema/dist/src/types.js";

const require = createRequire(new URL("../packages/schema/package.json", import.meta.url));
const { toJSONSchema } = require("zod");
const schema = toJSONSchema(configProjectSchema, { io: "input" });
schema.$id = "https://clash-configuratoe.local/schema/config-project.schema.json";
schema.title = "ConfigProject";
for (const branch of schema.properties.nodes.items.oneOf ?? schema.properties.nodes.items.anyOf) {
  if (branch.properties.kind.const === "vlessProxy") branch.properties.vlessUrl.pattern = "^vless://";
}
await writeFile(new URL("../packages/schema/jsonschema/config-project.schema.json", import.meta.url), JSON.stringify(schema, null, 2) + "\n");
console.log("ConfigProject JSON Schema generated from the runtime Zod contract.");
