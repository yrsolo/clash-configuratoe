import { describe, expect, it } from "vitest";

import { createDemoProject, renderClashYaml, validateProject } from "../src/index";

describe("renderClashYaml", () => {
  it("creates a valid YAML document for the demo project", () => {
    const project = createDemoProject();
    const yaml = renderClashYaml(project);

    expect(validateProject(project)).toEqual([]);
    expect(yaml).toContain("proxy-providers:");
    expect(yaml).toContain("proxy-groups:");
    expect(yaml).toContain("rules:");
    expect(yaml).toContain("AI Services");
    expect(yaml).toContain("Rest Of World");
    expect(yaml).toContain("health-check:");
    expect(yaml).not.toContain("healthCheck:");
    expect(yaml).toMatch(/url:\s+"https?:\/\/.+"/);
  });

  it("renders a custom ping url for auto-select groups when enabled", () => {
    const project = createDemoProject();
    const telegramGroup = project.nodes.find(
      (node) => node.kind === "proxyGroup" && node.group.name === "Telegram"
    );

    if (!telegramGroup || telegramGroup.kind !== "proxyGroup") {
      throw new Error("Telegram group not found in demo project");
    }

    telegramGroup.group.autoSelect = true;
    telegramGroup.group.customHealthCheckEnabled = true;
    telegramGroup.group.customHealthCheckUrl = "https://cp.cloudflare.com/generate_204";

    const yaml = renderClashYaml(project);

    expect(yaml).toContain('url: "https://cp.cloudflare.com/generate_204"');
  });
});
