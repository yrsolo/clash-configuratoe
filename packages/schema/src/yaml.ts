import { getDefaultFormatterUrl } from "./formatter";
import { stringify } from "yaml";

import type {
  CanvasGroup,
  ConfigNode,
  ConfigProject,
  GlobalSettingsNode,
  GraphEdge,
  ManualProxyNode,
  ProxyGroupNode,
  ProxyProviderNode,
  RuleSetNode
} from "./types";

const vlessUriToProxy = (link: string): Record<string, unknown> | null => {
  try {
    const url = new URL(link);
    if (url.protocol !== "vless:" || !url.username || !url.hostname) return null;
    const params = url.searchParams;
    const name = url.hash ? decodeURIComponent(url.hash.slice(1)) : `${url.hostname}:${url.port || "443"}`;
    const proxy: Record<string, unknown> = {
      name,
      type: "vless",
      server: url.hostname,
      port: Number(url.port || 443),
      uuid: decodeURIComponent(url.username),
      network: params.get("type") || "tcp",
      udp: true
    };
    if (params.get("security") === "reality") {
      proxy.tls = true;
      if (params.get("sni")) proxy.servername = params.get("sni")!;
      if (params.get("fp")) proxy["client-fingerprint"] = params.get("fp")!;
      if (params.get("flow")) proxy.flow = params.get("flow")!;
      if (params.get("pbk")) {
        proxy["reality-opts"] = {
          "public-key": params.get("pbk")!,
          ...(params.get("sid") ? { "short-id": params.get("sid")! } : {})
        };
      }
    }
    return proxy;
  } catch {
    return null;
  }
};

const quoteYamlUrlScalars = (yaml: string) =>
  yaml.replace(/^(\s*url:\s*)(.+)$/gm, (_match, prefix: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "null") {
      return `${prefix}${trimmed}`;
    }

    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return `${prefix}${trimmed}`;
    }

    const escaped = trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `${prefix}"${escaped}"`;
  });

const findNode = <T extends ConfigNode["kind"]>(
  nodes: ConfigNode[],
  id: string,
  kind?: T
): Extract<ConfigNode, { kind: T }> | ConfigNode | undefined => {
  const node = nodes.find((entry) => entry.id === id);

  if (!node) {
    return undefined;
  }

  if (!kind || node.kind === kind) {
    return node;
  }

  return undefined;
};

const getGlobalSettings = (project: ConfigProject): GlobalSettingsNode | undefined =>
  project.nodes.find((node): node is GlobalSettingsNode => node.kind === "globalSettings");

const buildFormatterUrl = (baseUrl: string, subscriptionUrl: string, sourceFormat?: string) => {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}url=${encodeURIComponent(subscriptionUrl)}${sourceFormat === "clash" ? "&format=clash" : ""}`;
};

type SourcePathContext = {
  filterTerms?: string[];
  invert?: boolean;
};

type ResolvedSource =
  | {
      kind: "provider";
      provider: ProxyProviderNode;
      context: SourcePathContext;
    }
  | {
      kind: "manual";
      proxy: ManualProxyNode;
      context: SourcePathContext;
    }
  | {
      kind: "vless";
      proxy: Record<string, unknown>;
      name: string;
      context: SourcePathContext;
    }
  | {
      kind: "group";
      group: ProxyGroupNode;
      context: SourcePathContext;
    };

const applyNameFilters = (name: string, context: SourcePathContext) => {
  const terms = context.filterTerms?.filter(Boolean) ?? [];
  if (terms.length === 0) {
    return true;
  }

  const matched = terms.some((term) => name.toLowerCase().includes(term.toLowerCase()));
  return context.invert ? matched : !matched;
};

const resolveIncomingSources = (
  project: ConfigProject,
  targetId: string,
  context: SourcePathContext = {},
  seen = new Set<string>()
): ResolvedSource[] => {
  const incoming = project.edges.filter((edge) => edge.kind === "group-source" && edge.target === targetId);
  const resolved: ResolvedSource[] = [];

  for (const edge of incoming) {
    const source = findNode(project.nodes, edge.source);
    if (!source) {
      continue;
    }
    if (source.enabled === false) {
      continue;
    }

    const visitKey = `${source.id}:${targetId}:${(context.filterTerms ?? []).join("|")}:${context.invert ? "1" : "0"}`;
    if (seen.has(visitKey)) {
      continue;
    }
    seen.add(visitKey);

    if (source.kind === "sourceMerge") {
      resolved.push(
        ...resolveIncomingSources(
          project,
          source.id,
          source.merge.filterEnabled
            ? {
                filterTerms: source.merge.filterTerms,
                invert: source.merge.invert
              }
            : context,
          seen
        )
      );
      continue;
    }

    if (source.kind === "proxyProvider") {
      resolved.push({ kind: "provider", provider: source, context });
      continue;
    }

    if (source.kind === "manualProxy") {
      if (applyNameFilters(source.proxy.name, context)) {
        resolved.push({ kind: "manual", proxy: source, context });
      }
      continue;
    }

    if (source.kind === "vlessProxy") {
      const proxy = vlessUriToProxy(source.vlessUrl);
      const name = typeof proxy?.name === "string" ? proxy.name : source.label;
      if (proxy && applyNameFilters(name, context)) resolved.push({ kind: "vless", proxy, name, context });
      continue;
    }

    if (source.kind === "proxyGroup") {
      if (applyNameFilters(source.group.name, context)) {
        resolved.push({ kind: "group", group: source, context });
      }
    }
  }

  return resolved;
};

const buildProviderEntry = (
  provider: ProxyProviderNode,
  globals?: GlobalSettingsNode,
  context: SourcePathContext = {}
) => {
  const filterSignature = `${(context.filterTerms ?? []).join("_")}_${context.invert ? "invert" : "exclude"}`;
  const providerKey = (context.filterTerms?.length ?? 0) > 0
    ? `${provider.providerKey}_${Math.abs(
        filterSignature.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
      )}`
    : provider.providerKey;

  return [
    providerKey,
    {
      type: provider.sourceType,
      url:
        provider.formatter.sourceFormat === "clash"
          ? buildFormatterUrl(globals?.settings.formatterUrl ?? getDefaultFormatterUrl(), provider.subscriptionUrl, "clash")
          : provider.formatter.enabled && globals?.settings.formatterUrl
          ? buildFormatterUrl(globals.settings.formatterUrl, provider.subscriptionUrl)
          : provider.subscriptionUrl,
      interval: globals?.settings.sourceUpdateInterval ?? provider.interval,
        path: provider.path,
        override: { "additional-prefix": `${provider.providerKey} ` },
      filter: context.invert && (context.filterTerms?.length ?? 0) > 0 ? context.filterTerms?.join("|") : undefined,
      "exclude-filter":
        !context.invert && (context.filterTerms?.length ?? 0) > 0 ? context.filterTerms?.join("|") : undefined,
      "health-check": {
        enable: provider.healthCheck.enable,
        interval: globals?.settings.sourceHealthCheckInterval ?? provider.healthCheck.interval,
        url: globals?.settings.healthCheckUrl ?? provider.healthCheck.url
      }
    }
  ] as const;
};

const pushRules = (bucket: string[], rules: RuleSetNode["ruleSet"], targetName: string) => {
  for (const domain of rules.domains) {
    bucket.push(`DOMAIN,${domain},${targetName}`);
  }

  for (const suffix of rules.domainSuffixes) {
    bucket.push(`DOMAIN-SUFFIX,${suffix},${targetName}`);
  }

  for (const keyword of rules.domainKeywords) {
    bucket.push(`DOMAIN-KEYWORD,${keyword},${targetName}`);
  }

  for (const geosite of rules.geosites) {
    bucket.push(`GEOSITE,${geosite},${targetName}`);
  }

  for (const geoip of rules.geoips) {
    bucket.push(`GEOIP,${geoip},${targetName}`);
  }

  for (const processName of rules.processNames) {
    bucket.push(`PROCESS-NAME,${processName},${targetName}`);
  }

  for (const cidr of rules.ipCidrs) {
    bucket.push(`IP-CIDR,${cidr},${targetName}`);
  }

  for (const rawRule of rules.rawRules) {
    if (rawRule.includes(",") && !rawRule.endsWith(targetName) && !rawRule.endsWith("DIRECT")) {
      const parts = rawRule.split(",");
      if (parts.length >= 2) {
        bucket.push(`${parts[0]},${parts[1]},${targetName}`);
        continue;
      }
    }
    bucket.push(rawRule);
  }

  if (rules.match) {
    bucket.push(`MATCH,${targetName}`);
  }
};

const getRulesForPanel = (project: ConfigProject, panelId: string) =>
  project.nodes
    .filter(
      (node): node is RuleSetNode =>
        node.kind === "ruleSet" &&
        node.enabled !== false &&
        node.canvasGroupId === panelId
    )
    .sort((left, right) => {
      const firstDelta = Number(right.ruleSet.first) - Number(left.ruleSet.first);
      if (firstDelta !== 0) return firstDelta;
      if (left.position.y !== right.position.y) return left.position.y - right.position.y;
      return left.position.x - right.position.x;
    });

const getRuleConnections = (project: ConfigProject) => {
  const panelsById = new Map(project.canvasGroups.map((panel) => [panel.id, panel] as const));
  const connections: Array<{ edge: GraphEdge; panel?: CanvasGroup; rulesets: RuleSetNode[] }> = [];

  for (const edge of project.edges.filter((entry) => entry.kind === "ruleset-target")) {
    const panel = panelsById.get(edge.source);
    if (panel?.role === "rulePanel") {
      connections.push({
        edge,
        panel,
        rulesets: getRulesForPanel(project, panel.id)
      });
      continue;
    }

    const source = findNode(project.nodes, edge.source, "ruleSet");
    if (source && source.kind === "ruleSet" && source.enabled !== false) {
      connections.push({ edge, rulesets: [source] });
    }
  }

  return connections;
};

export const projectToClashObject = (project: ConfigProject) => {
  const globals = getGlobalSettings(project);
  const proxies = project.nodes.filter((node): node is ManualProxyNode => node.kind === "manualProxy" && node.enabled !== false);
  const vlessProxies = project.nodes
    .filter(
      (node): node is Extract<ConfigNode, { kind: "vlessProxy" }> =>
        node.kind === "vlessProxy" && node.enabled !== false
    )
    .map((node) => vlessUriToProxy(node.vlessUrl))
    .filter((proxy): proxy is Record<string, unknown> => proxy !== null);
  const groups = project.nodes.filter((node): node is ProxyGroupNode => node.kind === "proxyGroup" && node.enabled !== false);
  const providerEntries = new Map<string, Record<string, unknown>>();
  const yamlGroups = groups.map((group) => {
    const resolved = resolveIncomingSources(project, group.id);

    const use = resolved
      .filter((item): item is Extract<ResolvedSource, { kind: "provider" }> => item.kind === "provider")
      .map(({ provider, context }) => {
        const [key, entry] = buildProviderEntry(provider, globals, context);
        providerEntries.set(key, entry);
        return key;
      });

    const linkedProxies = resolved
      .filter((item): item is Extract<ResolvedSource, { kind: "manual" }> => item.kind === "manual")
      .map(({ proxy }) => proxy.proxy.name);

    const linkedVlessProxies = resolved
      .filter((item): item is Extract<ResolvedSource, { kind: "vless" }> => item.kind === "vless")
      .map(({ name }) => name);

    const linkedGroups = resolved
      .filter((item): item is Extract<ResolvedSource, { kind: "group" }> => item.kind === "group")
      .map(({ group: sourceGroup }) => sourceGroup.group.name);

    const proxiesList = [
      ...(group.group.includeDirect ? ["DIRECT"] : []),
      ...linkedProxies,
      ...linkedVlessProxies,
      ...linkedGroups
    ];

    const groupObject: Record<string, unknown> = {
      name: group.group.name,
      type: group.group.autoSelect ? "url-test" : "select"
    };

    if (group.group.autoSelect) {
      groupObject.url = group.group.customHealthCheckEnabled
        ? group.group.customHealthCheckUrl
        : globals?.settings.healthCheckUrl ?? "http://www.gstatic.com/generate_204";
      groupObject.interval = group.group.interval;
      groupObject.tolerance = group.group.tolerance;
    }

    if (use.length > 0) {
      groupObject.use = Array.from(new Set(use));
    }

    if (proxiesList.length > 0) {
      groupObject.proxies = Array.from(new Set(proxiesList));
    }

    return groupObject;
  });

  const rules: string[] = [];
  const firstRules: string[] = [];
  const normalRules: string[] = [];

  for (const connection of getRuleConnections(project)) {
    const target = findNode(project.nodes, connection.edge.target, "proxyGroup");
    const targetName = target && target.kind === "proxyGroup" ? target.group.name : "DIRECT";

    for (const ruleset of connection.rulesets) {
      pushRules(ruleset.ruleSet.first ? firstRules : normalRules, ruleset.ruleSet, targetName);
    }
  }

  rules.push(...firstRules, ...normalRules);

  if (!rules.some((rule) => rule.startsWith("MATCH,"))) {
    const catchAllGroup = groups.find((group) => group.group.catchAll);
    rules.push(`MATCH,${catchAllGroup?.group.name ?? "DIRECT"}`);
  }

  return {
    profile: {
      "store-selected": true
    },
    "proxy-providers": Object.fromEntries(providerEntries),
    proxies: [...proxies.map((proxy) => proxy.proxy), ...vlessProxies],
    "proxy-groups": yamlGroups,
    rules
  };
};

export const renderClashYaml = (project: ConfigProject): string =>
  quoteYamlUrlScalars(stringify(projectToClashObject(project)));
