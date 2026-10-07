import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { importClashYaml, renderClashYaml } from "../src/index";

describe("importClashYaml", () => {
  it("round-trips native Clash subscriptions without decoding secret URLs twice", () => {
    const subscription = "https://subscription.example/feed?token=a%2Fb";
    const project = importClashYaml(`proxy-providers:\n  native:\n    type: http\n    url: https://formatter.example/api/formatter?url=${encodeURIComponent(subscription)}&format=clash\nproxy-groups:\n  - name: Mine\n    type: select\n    use: [native]\nrules: [MATCH,Mine]\n`);
    const provider = project.nodes.find(node => node.kind === "proxyProvider");
    expect(provider?.kind === "proxyProvider" && provider.subscriptionUrl).toBe(subscription);
    expect(provider?.kind === "proxyProvider" && provider.formatter.sourceFormat).toBe("clash");
    expect(renderClashYaml(project)).toContain("&format=clash");
    expect(renderClashYaml(project)).toContain(encodeURIComponent(subscription));
  });
  it("imports a standard Clash YAML example into the canonical model", () => {
    const yaml = readFileSync(resolve(process.cwd(), "../../example/Merge.yaml"), "utf8");
    const project = importClashYaml(yaml);

    expect(project.nodes.some((node) => node.kind === "proxyProvider")).toBe(true);
    expect(project.nodes.some((node) => node.kind === "proxyGroup")).toBe(true);
    expect(project.nodes.some((node) => node.kind === "ruleSet")).toBe(true);
    expect(renderClashYaml(project)).toContain("proxy-groups:");
  });

  it("imports a VLESS Reality proxy into a direct VLESS link node", () => {
    const yaml = `proxies:
  - name: Reality
    type: vless
    server: test.example
    port: 443
    uuid: 11111111-2222-3333-4444-555555555555
    network: tcp
    tls: true
    servername: www.example.com
    client-fingerprint: chrome
    flow: xtls-rprx-vision
    reality-opts:
      public-key: test-key
      short-id: abcd
proxy-groups:
  - name: Select
    type: select
    proxies: [Reality]
rules: [MATCH,Select]`;
    const project = importClashYaml(yaml);
    const node = project.nodes.find((entry) => entry.kind === "vlessProxy");

    expect(node).toBeDefined();
    expect(node?.kind === "vlessProxy" && node.vlessUrl).toContain("security=reality");
    expect(renderClashYaml(project)).toContain("public-key: test-key");
  });
});
