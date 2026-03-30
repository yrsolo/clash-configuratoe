import { builtInPresets } from "./presets";
import type {
  CanvasGroup,
  ConfigProject,
  GlobalSettingsNode,
  GraphEdge,
  ProxyGroupNode,
  ProxyProviderNode,
  RuleSetNode,
  SourceMergeNode
} from "./types";

const cyrillicMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya"
};

export const nowIso = () => new Date().toISOString();

export const transliterateLabel = (value: string) => {
  const latin = value
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      const mapped = cyrillicMap[lower];

      if (!mapped) {
        return char;
      }

      return char === lower ? mapped : mapped.toUpperCase();
    })
    .join("");

  const cleaned = latin
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "_");

  return cleaned || "GROUP";
};

export const getVisibleRuleSections = (ruleSet: RuleSetNode["ruleSet"]) => {
  const sections = new Set(ruleSet.visibleSections);

  if (ruleSet.domains.length > 0) sections.add("domains");
  if (ruleSet.domainSuffixes.length > 0) sections.add("domainSuffixes");
  if (ruleSet.domainKeywords.length > 0) sections.add("domainKeywords");
  if (ruleSet.geosites.length > 0) sections.add("geosites");
  if (ruleSet.geoips.length > 0) sections.add("geoips");
  if (ruleSet.processNames.length > 0) sections.add("processNames");
  if (ruleSet.ipCidrs.length > 0) sections.add("ipCidrs");
  if (ruleSet.rawRules.length > 0) sections.add("rawRules");
  if (ruleSet.match) sections.add("match");

  return Array.from(sections);
};

export const classifyEdgeKind = (
  sourceKind: string,
  targetKind: string
): GraphEdge["kind"] | null => {
  if (
    ["proxyProvider", "manualProxy", "sourceMerge", "proxyGroup"].includes(sourceKind) &&
    ["sourceMerge", "proxyGroup"].includes(targetKind)
  ) {
    return "group-source";
  }

  if (sourceKind === "ruleSet" && targetKind === "proxyGroup") {
    return "ruleset-target";
  }

  return null;
};

export const createCanvasGroup = (overrides: Partial<CanvasGroup> = {}): CanvasGroup => ({
  id: overrides.id ?? crypto.randomUUID(),
  label: overrides.label ?? "Canvas Panel",
  enabled: overrides.enabled ?? true,
  role: overrides.role ?? "rulePanel",
  color: overrides.color ?? "#dbeafe",
  position: overrides.position ?? { x: 40, y: 40 },
  size: overrides.size ?? { width: 340, height: 260 }
});

export const createDemoProject = (): ConfigProject => {
  const createdAt = nowIso();
  const mainPanel = createCanvasGroup({
    label: "Traffic Sources & Routing",
    role: "generic",
    position: { x: 20, y: 20 },
    size: { width: 980, height: 860 }
  });

  const directPanel = createCanvasGroup({
    label: "Direct & Local",
    role: "rulePanel",
    color: "#fde68a",
    position: { x: 1040, y: 40 },
    size: { width: 270, height: 220 }
  });
  const aiPanel = createCanvasGroup({
    label: "AI Routing",
    role: "rulePanel",
    color: "#fde68a",
    position: { x: 1330, y: 40 },
    size: { width: 270, height: 220 }
  });
  const telegramPanel = createCanvasGroup({
    label: "Telegram Routing",
    role: "rulePanel",
    color: "#fde68a",
    position: { x: 1040, y: 300 },
    size: { width: 270, height: 220 }
  });
  const mediaPanel = createCanvasGroup({
    label: "Media Routing",
    role: "rulePanel",
    color: "#fde68a",
    position: { x: 1330, y: 300 },
    size: { width: 270, height: 320 }
  });
  const fallbackPanel = createCanvasGroup({
    label: "Fallback Routing",
    role: "rulePanel",
    color: "#fde68a",
    position: { x: 1040, y: 560 },
    size: { width: 270, height: 170 }
  });

  const globals: GlobalSettingsNode = {
    id: crypto.randomUUID(),
    kind: "globalSettings",
    label: "Global Settings",
    position: { x: 40, y: 60 },
    enabled: true,
    settings: {
      sourceUpdateInterval: 3600,
      sourceHealthCheckInterval: 600,
      healthCheckUrl: "http://www.gstatic.com/generate_204",
      formatterUrl: "https://clash.solofarm.ru/api/formatter"
    }
  };

  const provider: ProxyProviderNode = {
    id: crypto.randomUUID(),
    kind: "proxyProvider",
    label: "Lib Auto",
    position: { x: 40, y: 250 },
    enabled: true,
    canvasGroupId: mainPanel.id,
    providerKey: "lib_auto",
    sourceType: "http",
    subscriptionUrl:
      "https://connliberty.com/connection/subs/23213932-1a03-4c0e-b80b-51ae3384edc7",
    resolverMode: "stub",
    interval: 3600,
    path: "./lib_auto.yaml",
    healthCheck: {
      enable: true,
      interval: 600,
      url: "http://www.gstatic.com/generate_204"
    },
    formatter: {
      enabled: true
    }
  };

  const personalProxy = {
    id: crypto.randomUUID(),
    kind: "manualProxy" as const,
    label: "Personal HTTP",
    position: { x: 40, y: 430 },
    enabled: true,
    canvasGroupId: mainPanel.id,
    proxy: {
      name: "Personal_HTTP",
      type: "http" as const,
      server: "195.158.194.74",
      port: 8000,
      username: "demo",
      password: "demo"
    }
  };

  const merge: SourceMergeNode = {
    id: crypto.randomUUID(),
    kind: "sourceMerge",
    label: "Main Pool",
    position: { x: 360, y: 330 },
    enabled: true,
    canvasGroupId: mainPanel.id,
    merge: {
      strategy: "combine",
      filterEnabled: true,
      filterTerms: ["Russia", "RU", "Россия"],
      invert: false
    }
  };

  const groups: ProxyGroupNode[] = [
    {
      id: crypto.randomUUID(),
      kind: "proxyGroup",
      label: transliterateLabel("AI Services"),
      position: { x: 700, y: 150 },
      enabled: true,
      canvasGroupId: mainPanel.id,
      group: {
        name: "AI Services",
        includeDirect: true,
        autoSelect: false,
        catchAll: false,
        interval: 300,
        tolerance: 300
      }
    },
    {
      id: crypto.randomUUID(),
      kind: "proxyGroup",
      label: transliterateLabel("Telegram"),
      position: { x: 700, y: 310 },
      enabled: true,
      canvasGroupId: mainPanel.id,
      group: {
        name: "Telegram",
        includeDirect: false,
        autoSelect: true,
        catchAll: false,
        interval: 300,
        tolerance: 300
      }
    },
    {
      id: crypto.randomUUID(),
      kind: "proxyGroup",
      label: transliterateLabel("Video Content"),
      position: { x: 700, y: 470 },
      enabled: true,
      canvasGroupId: mainPanel.id,
      group: {
        name: "Video Content",
        includeDirect: true,
        autoSelect: false,
        catchAll: false,
        interval: 300,
        tolerance: 300
      }
    },
    {
      id: crypto.randomUUID(),
      kind: "proxyGroup",
      label: transliterateLabel("Rest Of World"),
      position: { x: 700, y: 630 },
      enabled: true,
      canvasGroupId: mainPanel.id,
      group: {
        name: "Rest Of World",
        includeDirect: true,
        autoSelect: false,
        catchAll: true,
        interval: 300,
        tolerance: 300
      }
    }
  ];

  const panelByPresetId: Record<string, CanvasGroup> = {
    "preset-local-direct": directPanel,
    "preset-ai": aiPanel,
    "preset-telegram": telegramPanel,
    "preset-video": mediaPanel,
    "preset-torrents": mediaPanel,
    "preset-rest": fallbackPanel
  };

  const panelChildrenOffset = new Map<string, number>();
  const rulesets: RuleSetNode[] = builtInPresets.map((preset) => {
    const panel = panelByPresetId[preset.id] ?? fallbackPanel;
    const indexInPanel = panelChildrenOffset.get(panel.id) ?? 0;
    panelChildrenOffset.set(panel.id, indexInPanel + 1);

    return {
      id: crypto.randomUUID(),
      kind: "ruleSet",
      label: preset.label,
      position: {
        x: panel.position.x + 14,
        y: panel.position.y + 48 + indexInPanel * 98
      },
      enabled: true,
      canvasGroupId: panel.id,
      ruleSet: {
        ...preset.ruleSet,
        visibleSections: getVisibleRuleSections(preset.ruleSet)
      }
    };
  });

  const edges: GraphEdge[] = [
    {
      id: crypto.randomUUID(),
      source: provider.id,
      target: merge.id,
      kind: "group-source"
    },
    {
      id: crypto.randomUUID(),
      source: personalProxy.id,
      target: merge.id,
      kind: "group-source"
    },
    ...groups.map((group) => ({
      id: crypto.randomUUID(),
      source: merge.id,
      target: group.id,
      kind: "group-source" as const
    })),
    {
      id: crypto.randomUUID(),
      source: directPanel.id,
      target: groups.at(-1)!.id,
      kind: "ruleset-target"
    },
    {
      id: crypto.randomUUID(),
      source: aiPanel.id,
      target: groups[0].id,
      kind: "ruleset-target"
    },
    {
      id: crypto.randomUUID(),
      source: telegramPanel.id,
      target: groups[1].id,
      kind: "ruleset-target"
    },
    {
      id: crypto.randomUUID(),
      source: mediaPanel.id,
      target: groups[2].id,
      kind: "ruleset-target"
    },
    {
      id: crypto.randomUUID(),
      source: fallbackPanel.id,
      target: groups.at(-1)!.id,
      kind: "ruleset-target"
    }
  ];

  return {
    id: crypto.randomUUID(),
    name: "Starter Clash Verge Config",
    description: "Demo project with preset routing groups and rules.",
    nodes: [globals, provider, personalProxy, merge, ...groups, ...rulesets],
    edges,
    canvasGroups: [mainPanel, directPanel, aiPanel, telegramPanel, mediaPanel, fallbackPanel],
    meta: {
      version: 1,
      createdAt,
      updatedAt: createdAt
    }
  };
};
