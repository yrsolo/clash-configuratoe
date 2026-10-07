import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { configProjectSchema, projectToClashObject, validateProject, importClashYaml, renderClashYaml } from "../src/index";

const starter = () => configProjectSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "../../default/new.json"), "utf8")));

describe("handover starter", () => {
  it("starts with no active credential-bearing sources and a valid DIRECT fallback", () => {
    const project = starter();
    expect(validateProject(project)).toEqual([]);
    const sources = project.nodes.filter(node => ["proxyProvider", "manualProxy", "vlessProxy"].includes(node.kind));
    expect(sources.every(node => !node.enabled)).toBe(true);
    const config = projectToClashObject(project) as any;
    expect(config["proxy-providers"]).toEqual({});
    expect(config.proxies).toEqual([]);
    expect(config["proxy-groups"].every((group: any) => group.proxies.includes("DIRECT"))).toBe(true);
    expect(config.rules.at(-1)).toBe("MATCH,🌍 REST_OF_WORLD");
  });

  it("keeps torrent websites proxied and torrent client traffic direct", () => {
    const config = projectToClashObject(starter()) as any;
    expect(config.rules).toContain("DOMAIN-SUFFIX,rutracker.org,🏴‍☠️ TORRENTS");
    expect(config.rules).toContain("PROCESS-NAME,qbittorrent.exe,DIR");
    expect(config.rules).toContain("IP-CIDR,100.64.0.0/10,DIR");
  });

  it("does not redirect imported subscriptions to the former owner's formatter", () => {
    const project = importClashYaml("proxy-providers:\n  mine:\n    type: http\n    url: https://my-formatter.example/api/formatter?url=https%3A%2F%2Fsubscription.example%2Ffeed&format=clash\nproxy-groups:\n  - name: Mine\n    type: select\n    use: [mine]\nrules: [MATCH,Mine]\n");
    const yaml = parse(renderClashYaml(project));
    expect(new URL(yaml["proxy-providers"].mine.url).origin).toBe("https://my-formatter.example");
  });
});
