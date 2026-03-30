import type { ConfigNode, ConfigProject, GraphEdge, ProxyGroupNode } from "./types";

const findNode = (nodes: ConfigNode[], id: string) => nodes.find((node) => node.id === id);

const sourceFlowTargets = new Set(["sourceMerge", "proxyGroup"]);
const sourceFlowSources = new Set([
  "proxyProvider",
  "manualProxy",
  "sourceMerge",
  "proxyGroup"
]);

export const validateProject = (project: ConfigProject): string[] => {
  const issues: string[] = [];
  const names = new Set<string>();

  for (const node of project.nodes) {
    if (node.kind === "proxyProvider") {
      if (names.has(node.providerKey)) {
        issues.push(`Duplicate provider key: ${node.providerKey}`);
      }
      names.add(node.providerKey);
    }

    if (node.kind === "manualProxy") {
      if (names.has(node.proxy.name)) {
        issues.push(`Duplicate proxy name: ${node.proxy.name}`);
      }
      names.add(node.proxy.name);
    }

    if (node.kind === "proxyGroup") {
      if (names.has(node.group.name)) {
        issues.push(`Duplicate group name: ${node.group.name}`);
      }
      names.add(node.group.name);
    }
  }

  for (const edge of project.edges) {
    const source = findNode(project.nodes, edge.source);
    const target = findNode(project.nodes, edge.target);
    const sourcePanel = project.canvasGroups.find((group) => group.id === edge.source);
    const targetPanel = project.canvasGroups.find((group) => group.id === edge.target);

    if (!source && !sourcePanel) {
      issues.push(`Broken edge ${edge.id}: missing source or target.`);
      continue;
    }

    if (!target && !targetPanel) {
      issues.push(`Broken edge ${edge.id}: missing source or target.`);
      continue;
    }

    if ((source && source.enabled === false) || (target && target.enabled === false)) {
      continue;
    }

    if (edge.kind === "group-source") {
      if (!source || !target || !sourceFlowSources.has(source.kind) || !sourceFlowTargets.has(target.kind)) {
        issues.push(`Edge ${edge.id} must stay inside the source pipeline or enter a proxy group.`);
      }
    }

    if (edge.kind === "ruleset-target") {
      const isDirectRule = source?.kind === "ruleSet" && target?.kind === "proxyGroup";
      const isPanelRule =
        sourcePanel?.role === "rulePanel" && target?.kind === "proxyGroup";

      if (!isDirectRule && !isPanelRule) {
        issues.push(`Edge ${edge.id} must connect a rule panel or a rule set to a proxy group.`);
      }
    }
  }

  const groupIds = new Set(
    project.nodes.filter((node): node is ProxyGroupNode => node.kind === "proxyGroup").map((node) => node.id)
  );

  for (const node of project.nodes) {
    if (node.enabled === false) {
      continue;
    }

    if (node.kind === "ruleSet") {
      const hasPanelTarget =
        !!node.canvasGroupId &&
        project.edges.some(
          (edge) =>
            edge.kind === "ruleset-target" &&
            edge.source === node.canvasGroupId &&
            groupIds.has(edge.target)
        );

      const hasDirectTarget = project.edges.some(
        (edge) => edge.kind === "ruleset-target" && edge.source === node.id && groupIds.has(edge.target)
      );

      if (!hasPanelTarget && !hasDirectTarget) {
        issues.push(`Rule set "${node.label}" is not connected to any proxy group.`);
      }
    }

    if (node.kind === "proxyGroup") {
      const catchAllCount = project.nodes.filter(
        (entry): entry is ProxyGroupNode =>
          entry.kind === "proxyGroup" && entry.enabled !== false && entry.group.catchAll
      ).length;
      if (catchAllCount > 1) {
        issues.push("Only one proxy group can have the All flag.");
      }

      const hasIncomingSource = project.edges.some(
        (edge) => edge.kind === "group-source" && edge.target === node.id
      );

      if (!hasIncomingSource) {
        issues.push(`Proxy group "${node.group.name}" has no connected sources.`);
      }
    }
  }

  const visit = (current: string, seen: Set<string>, stack: Set<string>) => {
    if (stack.has(current)) {
      issues.push(`Cycle detected at node ${current}.`);
      return;
    }

    if (seen.has(current)) {
      return;
    }

    seen.add(current);
    stack.add(current);

    for (const edge of project.edges.filter((entry) => entry.source === current)) {
      visit(edge.target, seen, stack);
    }

    stack.delete(current);
  };

  const seen = new Set<string>();
  const stack = new Set<string>();
  for (const node of project.nodes) {
    visit(node.id, seen, stack);
  }

  return Array.from(new Set(issues));
};

export const canConnectNodes = (source: ConfigNode, target: ConfigNode): GraphEdge["kind"] | null => {
  if (
    source.id !== target.id &&
    sourceFlowSources.has(source.kind) &&
    sourceFlowTargets.has(target.kind)
  ) {
    return "group-source";
  }

  if (source.kind === "ruleSet" && target.kind === "proxyGroup") {
    return "ruleset-target";
  }

  return null;
};
