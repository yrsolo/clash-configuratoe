import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { createDemoProject, renderClashYaml, validateProject } from "../src/index";

describe("renderClashYaml", () => {
  it("prefixes provider nodes with their Provider key", () => {
    const project = createDemoProject();
    const yaml = parse(renderClashYaml(project));
    for (const node of project.nodes) {
      if (node.kind === "proxyProvider") {
        const providers = Object.entries(yaml["proxy-providers"]).filter(([key]) => key === node.providerKey || key.startsWith(`${node.providerKey}_`));
        expect(providers.length).toBeGreaterThan(0);
        for (const [, provider] of providers) {
          expect((provider as any).override["additional-prefix"]).toBe(`${node.providerKey} `);
        }
      }
    }
  });
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

  it("does not emit unsupported GEOSITE,ru rules for russian services", () => {
    const project = createDemoProject();
    const yaml = renderClashYaml(project);

    expect(yaml).not.toContain("GEOSITE,ru,");
    expect(yaml).toContain("GEOIP,ru,");
  });

  it("renders a direct VLESS Reality URI as a Clash proxy", () => {
    const project = createDemoProject();
    const group = project.nodes.find((node) => node.kind === "proxyGroup");
    if (!group || group.kind !== "proxyGroup") throw new Error("Proxy group not found");

    const vlessNode = {
      id: crypto.randomUUID(),
      kind: "vlessProxy" as const,
      label: "Test Reality",
      position: { x: 200, y: 200 },
      enabled: true,
      vlessUrl:
        "vless://11111111-2222-3333-4444-555555555555@test.example:443?security=reality&encryption=none&type=tcp&flow=xtls-rprx-vision&fp=chrome&pbk=test-public-key&sni=www.example.com&sid=abcd#Test%20Reality"
    };
    project.nodes.push(vlessNode);
    project.edges.push({
      id: crypto.randomUUID(),
      source: vlessNode.id,
      target: group.id,
      kind: "group-source"
    });

    const yaml = renderClashYaml(project);
    expect(yaml).toContain("type: vless");
    expect(yaml).toContain("server: test.example");
    expect(yaml).toContain("servername: www.example.com");
    expect(yaml).toContain("client-fingerprint: chrome");
    expect(yaml).toContain("public-key: test-public-key");
    expect(yaml).toContain("short-id: abcd");
    expect(yaml).toContain("- Test Reality");
  });
});
