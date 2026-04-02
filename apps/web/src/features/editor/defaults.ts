import type {
  ConfigNode,
  GlobalSettingsNode,
  ManualProxyNode,
  ProxyGroupNode,
  ProxyProviderNode,
  RuleSetNode,
  SourceMergeNode
} from "@clash-configuratoe/schema";
import { getVisibleRuleSections, transliterateLabel } from "@clash-configuratoe/schema";

const basePosition = (count: number) => ({ x: 80 + (count % 3) * 280, y: 80 + count * 40 });

export const createNode = (kind: ConfigNode["kind"], count: number): ConfigNode => {
  const id = crypto.randomUUID();
  const position = basePosition(count);

  if (kind === "proxyProvider") {
    const node: ProxyProviderNode = {
      id,
      kind,
      label: "New Provider",
      position,
      enabled: true,
      providerKey: `provider_${count + 1}`,
      sourceType: "http",
      subscriptionUrl: "https://connliberty.com/connection/subs/23213932-1a03-4c0e-b80b-51ae3384edc7",
      resolverMode: "stub",
      interval: 3600,
      path: `./provider_${count + 1}.yaml`,
      healthCheck: {
        enable: true,
        interval: 600,
        url: "http://www.gstatic.com/generate_204"
      },
      formatter: {
        enabled: true
      }
    };
    return node;
  }

  if (kind === "manualProxy") {
    const node: ManualProxyNode = {
      id,
      kind,
      label: "Manual Proxy",
      position,
      enabled: true,
      proxy: {
        name: `Manual_${count + 1}`,
        type: "http",
        server: "127.0.0.1",
        port: 8080,
        username: "",
        password: ""
      }
    };
    return node;
  }

  if (kind === "sourceMerge") {
    const node: SourceMergeNode = {
      id,
      kind,
      label: `Merge ${count + 1}`,
      position,
      enabled: true,
      merge: {
        strategy: "combine",
        filterEnabled: false,
        filterTerms: [],
        invert: false
      }
    };
    return node;
  }

  if (kind === "proxyGroup") {
    const groupName = `GROUP ${count + 1}`;
    const node: ProxyGroupNode = {
      id,
      kind,
      label: transliterateLabel(groupName),
      position,
      enabled: true,
      group: {
        name: groupName,
        includeDirect: true,
        autoSelect: false,
        catchAll: false,
        customHealthCheckEnabled: false,
        customHealthCheckUrl: "http://www.gstatic.com/generate_204",
        interval: 300,
        tolerance: 300
      }
    };
    return node;
  }

  if (kind === "globalSettings") {
    const node: GlobalSettingsNode = {
      id,
      kind,
      label: "Global Settings",
      position,
      enabled: true,
      settings: {
        sourceUpdateInterval: 3600,
        sourceHealthCheckInterval: 600,
        healthCheckUrl: "http://www.gstatic.com/generate_204",
        formatterUrl: "https://clash.solofarm.ru/api/formatter"
      }
    };
    return node;
  }

  const node: RuleSetNode = {
    id,
    kind: "ruleSet",
    label: `Rule Set ${count + 1}`,
    position,
    enabled: true,
    ruleSet: {
      visibleSections: ["domainSuffixes"],
      name: `Rule Set ${count + 1}`,
      first: false,
      domains: [],
      domainSuffixes: ["example.com"],
      domainKeywords: [],
      geosites: [],
      geoips: [],
      processNames: [],
      ipCidrs: [],
      rawRules: [],
      match: false
    }
  };
  node.ruleSet.visibleSections = getVisibleRuleSections(node.ruleSet);
  return node;
};
