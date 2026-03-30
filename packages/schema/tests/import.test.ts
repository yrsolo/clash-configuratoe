import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { importClashYaml, renderClashYaml } from "../src/index";

describe("importClashYaml", () => {
  it("imports a standard Clash YAML example into the canonical model", () => {
    const yaml = readFileSync(resolve(process.cwd(), "../../example/Merge.yaml"), "utf8");
    const project = importClashYaml(yaml);

    expect(project.nodes.some((node) => node.kind === "proxyProvider")).toBe(true);
    expect(project.nodes.some((node) => node.kind === "proxyGroup")).toBe(true);
    expect(project.nodes.some((node) => node.kind === "ruleSet")).toBe(true);
    expect(renderClashYaml(project)).toContain("proxy-groups:");
  });
});
