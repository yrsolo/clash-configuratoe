import { parse } from "yaml";

import { transliterateLabel } from "./project";
import type {
  ConfigNode,
  ConfigProject,
  GlobalSettingsNode,
  GraphEdge,
  ProxyGroupNode,
  ProxyProviderNode,
  RuleSetNode
} from "./types";

const getPosition = (index: number, lane: number) => ({
  x: 40 + lane * 320,
  y: 40 + index * 140
});

const createEmptyRuleSet = (name: string): RuleSetNode["ruleSet"] => ({
  name,
  visibleSections: [],
  first: false,
  domains: [],
  domainSuffixes: [],
  domainKeywords: [],
  geosites: [],
  geoips: [],
  processNames: [],
  ipCidrs: [],
  rawRules: [],
  match: false
});

export const importClashYaml = (source: string): ConfigProject => {
  const parsed = parse(source) as Record<string, any>;
  const createdAt = new Date().toISOString();

  const globals: GlobalSettingsNode = {
    id: crypto.randomUUID(),
    kind: "globalSettings",
    label: "Global Settings",
    position: { x: 40, y: 40 },
    enabled: true,
    settings: {
      sourceUpdateInterval: 3600,
      sourceHealthCheckInterval: 600,
      healthCheckUrl: "http://www.gstatic.com/generate_204",
      formatterUrl: "https://clash.solofarm.ru/api/formatter"
    }
  };

  let detectedFormatterUrl: string | undefined;

  const providerNodes: ProxyProviderNode[] = Object.entries(parsed["proxy-providers"] ?? {}).map(
    ([providerKey, providerRaw], index) => {
      const provider = providerRaw as Record<string, any>;
      let subscriptionUrl = provider.url ?? "https://resolver.invalid/?url=https%3A%2F%2Fexample.com";
      let formatterEnabled = false;

      try {
        const parsedUrl = new URL(String(provider.url));
        const nestedUrl = parsedUrl.searchParams.get("url");
        if (nestedUrl) {
          subscriptionUrl = decodeURIComponent(nestedUrl);
          formatterEnabled = true;
          detectedFormatterUrl = "https://clash.solofarm.ru/api/formatter";
        }
      } catch {
        // Keep original provider url when it is not a valid nested formatter URL.
      }

      return {
        id: crypto.randomUUID(),
        kind: "proxyProvider",
        label: providerKey,
        position: getPosition(index + 1, 0),
        enabled: true,
        providerKey,
        sourceType: "http",
        subscriptionUrl,
        resolverMode: "stub",
        interval: provider.interval ?? 3600,
        path: provider.path ?? `./${providerKey}.yaml`,
        healthCheck: {
          enable: provider["health-check"]?.enable ?? provider.healthCheck?.enable ?? true,
          interval: provider["health-check"]?.interval ?? provider.healthCheck?.interval ?? 600,
          url:
            provider["health-check"]?.url ??
            provider.healthCheck?.url ??
            "http://www.gstatic.com/generate_204"
        },
        formatter: {
          enabled: formatterEnabled
        }
      };
    }
  );

  if (detectedFormatterUrl) {
    globals.settings.formatterUrl = detectedFormatterUrl;
  }

  const proxyNodes: ConfigNode[] = (parsed.proxies ?? []).map((proxy: any, index: number) => ({
    id: crypto.randomUUID(),
    kind: "manualProxy",
    label: proxy.name,
    position: getPosition(index + 1, 0.9),
    enabled: true,
    proxy: {
      name: proxy.name,
      type: proxy.type ?? "http",
      server: proxy.server,
      port: Number(proxy.port),
      username: proxy.username,
      password: proxy.password,
      udp: proxy.udp
    }
  }));

  const parsedGroups = parsed["proxy-groups"] ?? [];
  const firstAutoSelectUrl = parsedGroups.find((group: any) => group.type === "url-test" && group.url)?.url;
  if (firstAutoSelectUrl) {
    globals.settings.healthCheckUrl = firstAutoSelectUrl;
  }

  const groupNodes: ProxyGroupNode[] = parsedGroups.map((group: any, index: number) => ({
    id: crypto.randomUUID(),
    kind: "proxyGroup",
    label: transliterateLabel(group.name),
    position: getPosition(index, 2.1),
    enabled: true,
    group: {
      name: group.name,
      includeDirect: Array.isArray(group.proxies) && group.proxies.includes("DIRECT"),
      autoSelect: group.type === "url-test",
      catchAll: false,
      customHealthCheckEnabled: Boolean(
        group.type === "url-test" &&
          group.url &&
          group.url !== firstAutoSelectUrl
      ),
      customHealthCheckUrl: group.url ?? "http://www.gstatic.com/generate_204",
      interval: group.interval ?? 300,
      tolerance: group.tolerance ?? 300
    }
  }));

  const edges: GraphEdge[] = [];

  for (const group of parsed["proxy-groups"] ?? []) {
    const targetNode = groupNodes.find((entry) => entry.group.name === group.name);
    if (!targetNode) {
      continue;
    }

    for (const providerKey of group.use ?? []) {
      const providerNode = providerNodes.find((entry) => entry.providerKey === providerKey);
      if (providerNode) {
        edges.push({
          id: crypto.randomUUID(),
          source: providerNode.id,
          target: targetNode.id,
          kind: "group-source"
        });
      }
    }

    for (const proxyName of group.proxies ?? []) {
      if (proxyName === "DIRECT") {
        continue;
      }

      const groupSourceNode = groupNodes.find((entry) => entry.group.name === proxyName);
      if (groupSourceNode) {
        edges.push({
          id: crypto.randomUUID(),
          source: groupSourceNode.id,
          target: targetNode.id,
          kind: "group-source"
        });
        continue;
      }

      const proxyNode = proxyNodes.find(
        (entry) => entry.kind === "manualProxy" && entry.proxy.name === proxyName
      );
      if (proxyNode) {
        edges.push({
          id: crypto.randomUUID(),
          source: proxyNode.id,
          target: targetNode.id,
          kind: "group-source"
        });
      }
    }
  }

  const groupedRules = new Map<string, RuleSetNode["ruleSet"]>();
  for (const rule of parsed.rules ?? []) {
    const parts = String(rule).split(",");
    const type = parts[0];
    const value = parts[1];
    const target = parts.at(-1) ?? "DIRECT";

    if (!groupedRules.has(target)) {
      groupedRules.set(target, createEmptyRuleSet(target));
    }

    const bucket = groupedRules.get(target)!;

    switch (type) {
      case "DOMAIN":
        bucket.domains.push(value);
        break;
      case "DOMAIN-SUFFIX":
        bucket.domainSuffixes.push(value);
        break;
      case "DOMAIN-KEYWORD":
        bucket.domainKeywords.push(value);
        break;
      case "GEOSITE":
        bucket.geosites.push(value);
        break;
      case "GEOIP":
        bucket.geoips.push(value);
        break;
      case "PROCESS-NAME":
        bucket.processNames.push(value);
        break;
      case "IP-CIDR":
        bucket.ipCidrs.push(value);
        break;
      case "MATCH":
        bucket.match = true;
        break;
      default:
        bucket.rawRules.push(String(rule));
        break;
    }
  }

  const ruleSetNodes: RuleSetNode[] = Array.from(groupedRules.entries()).map(([target, ruleSet], index) => ({
    id: crypto.randomUUID(),
    kind: "ruleSet",
    label: target === "DIRECT" ? "Direct Rules" : target,
    position: getPosition(index, 3.25),
    enabled: true,
    ruleSet: {
      ...ruleSet,
      visibleSections: Array.from(
        new Set([
          ...(ruleSet.domains.length > 0 ? ["domains"] : []),
          ...(ruleSet.domainSuffixes.length > 0 ? ["domainSuffixes"] : []),
          ...(ruleSet.domainKeywords.length > 0 ? ["domainKeywords"] : []),
          ...(ruleSet.geosites.length > 0 ? ["geosites"] : []),
          ...(ruleSet.geoips.length > 0 ? ["geoips"] : []),
          ...(ruleSet.processNames.length > 0 ? ["processNames"] : []),
          ...(ruleSet.ipCidrs.length > 0 ? ["ipCidrs"] : []),
          ...(ruleSet.rawRules.length > 0 ? ["rawRules"] : []),
          ...(ruleSet.match ? ["match"] : [])
        ])
      ) as RuleSetNode["ruleSet"]["visibleSections"],
      name: target === "DIRECT" ? "Direct Rules" : target
    }
  }));

  for (const ruleset of ruleSetNodes) {
    if (ruleset.ruleSet.match) {
      ruleset.ruleSet.first = false;
    }
  }

  for (const ruleset of ruleSetNodes) {
    const targetName = ruleset.label.replace(/ rules$/i, "");
    const targetNode = groupNodes.find((group) => group.group.name === targetName);
    if (targetNode) {
      edges.push({
        id: crypto.randomUUID(),
        source: ruleset.id,
        target: targetNode.id,
        kind: "ruleset-target"
      });
    }
  }

  return {
    id: crypto.randomUUID(),
    name: parsed.name ?? "Imported Clash Config",
    description: "Imported from Clash YAML.",
    nodes: [globals, ...providerNodes, ...proxyNodes, ...groupNodes, ...ruleSetNodes],
    edges,
    canvasGroups: [],
    meta: {
      version: 1,
      createdAt,
      updatedAt: createdAt
    }
  };
};
