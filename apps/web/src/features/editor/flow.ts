import type { CanvasGroup, ConfigNode, ConfigProject, GraphEdge } from "@clash-configuratoe/schema";
import { MarkerType, Position, type Edge, type Node } from "@xyflow/react";

type FlowOptions = {
  onToggleEnabled?: (nodeId: string, nextEnabled: boolean) => void;
  onTogglePanelEnabled?: (panelId: string, nextEnabled: boolean) => void;
};

type PanelLayout = {
  panels: Map<string, { position: { x: number; y: number }; size: { width: number; height: number } }>;
  rulePositions: Map<string, { x: number; y: number }>;
};

const RULE_PANEL_PADDING_X = 10;
const RULE_PANEL_PADDING_TOP = 38;
const RULE_PANEL_PADDING_BOTTOM = 12;
const RULE_PANEL_PADDING_RIGHT = 18;
const RULE_PANEL_MIN_WIDTH = 250;
const RULE_PANEL_OUTPUT_SPACE = 36;
const RULE_PANEL_GAP = 6;
const GENERIC_PANEL_MIN_WIDTH = 240;
const GENERIC_PANEL_MIN_HEIGHT = 180;

const isPointInsideRect = (
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
) =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height;

const getNodeCenter = (
  position: { x: number; y: number },
  dimensions: { width: number; height: number }
) => ({
  x: position.x + dimensions.width / 2,
  y: position.y + dimensions.height / 2
});

const getNodeDimensions = (node: ConfigNode) => {
  if (node.kind === "globalSettings") return { width: 290, height: 158 };
  if (node.kind === "proxyGroup") return { width: 280, height: 150 };
  if (node.kind === "ruleSet") return node.canvasGroupId ? { width: 226, height: 92 } : { width: 250, height: 148 };
  if (node.kind === "sourceMerge") return { width: 250, height: 128 };
  return { width: 250, height: 118 };
};

const buildPanelLayout = (project: ConfigProject): PanelLayout => {
  const panels = new Map<string, { position: { x: number; y: number }; size: { width: number; height: number } }>();
  const rulePositions = new Map<string, { x: number; y: number }>();

  for (const panel of project.canvasGroups) {
    if (panel.role !== "rulePanel") {
      panels.set(panel.id, {
        position: panel.position,
        size: panel.size
      });
      continue;
    }

    const children = project.nodes.filter(
      (node): node is Extract<ConfigNode, { kind: "ruleSet" }> =>
        node.kind === "ruleSet" && node.canvasGroupId === panel.id
    ).sort((left, right) => {
      if (left.position.y !== right.position.y) return left.position.y - right.position.y;
      return left.position.x - right.position.x;
    });

    let currentY = panel.position.y + RULE_PANEL_PADDING_TOP;
    let maxX = panel.position.x + RULE_PANEL_MIN_WIDTH;

    for (const child of children) {
      const dimensions = getNodeDimensions(child);
      rulePositions.set(child.id, {
        x: panel.position.x + RULE_PANEL_PADDING_X,
        y: currentY
      });
      currentY += dimensions.height + RULE_PANEL_GAP;
      maxX = Math.max(maxX, panel.position.x + RULE_PANEL_PADDING_X + dimensions.width);
    }

    const computedWidth =
      children.length > 0
        ? maxX - panel.position.x + RULE_PANEL_PADDING_RIGHT + RULE_PANEL_OUTPUT_SPACE
        : panel.size.width;

    const computedHeight =
      children.length > 0
        ? currentY - RULE_PANEL_GAP - panel.position.y + RULE_PANEL_PADDING_BOTTOM
        : panel.size.height;

    panels.set(panel.id, {
      position: panel.position,
      size: {
        width: Math.max(panel.size.width, RULE_PANEL_MIN_WIDTH, computedWidth),
        height: Math.max(panel.size.height, computedHeight)
      }
    });
  }

  return { panels, rulePositions };
};

const getNodeHandles = (node: ConfigNode, dimensions: { width: number; height: number }) => {
  const handleSize = 12;
  const centerY = dimensions.height / 2 - handleSize / 2;
  const lowerY = dimensions.height - 28;

  if (node.kind === "globalSettings") return [];

  if (node.kind === "proxyProvider" || node.kind === "manualProxy") {
    return [
      {
        id: `${node.id}-source-out`,
        type: "source" as const,
        position: Position.Right,
        x: dimensions.width - handleSize,
        y: centerY,
        width: handleSize,
        height: handleSize
      }
    ];
  }

  if (node.kind === "ruleSet") {
    if (node.canvasGroupId) return [];
    return [
      {
        id: `${node.id}-rule-out`,
        type: "source" as const,
        position: Position.Left,
        x: 0,
        y: centerY,
        width: handleSize,
        height: handleSize
      }
    ];
  }

  if (node.kind === "sourceMerge") {
    return [
      {
        id: `${node.id}-source-in`,
        type: "target" as const,
        position: Position.Left,
        x: 0,
        y: centerY,
        width: handleSize,
        height: handleSize
      },
      {
        id: `${node.id}-source-out`,
        type: "source" as const,
        position: Position.Right,
        x: dimensions.width - handleSize,
        y: centerY,
        width: handleSize,
        height: handleSize
      }
    ];
  }

  return [
    {
      id: `${node.id}-source-in`,
      type: "target" as const,
      position: Position.Left,
      x: 0,
      y: centerY,
      width: handleSize,
      height: handleSize
    },
    {
      id: `${node.id}-rule-in`,
      type: "target" as const,
      position: Position.Right,
      x: dimensions.width - handleSize,
      y: centerY,
      width: handleSize,
      height: handleSize
    },
    {
      id: `${node.id}-group-out`,
      type: "source" as const,
      position: Position.Left,
      x: 0,
      y: lowerY,
      width: handleSize,
      height: handleSize
    }
  ];
};

export const getPanelRect = (project: ConfigProject, panelId: string) => {
  const layout = buildPanelLayout(project).panels.get(panelId);
  if (!layout) return null;
  return {
    x: layout.position.x,
    y: layout.position.y,
    width: layout.size.width,
    height: layout.size.height
  };
};

export const findOverlappingPanel = (
  project: ConfigProject,
  nodePosition: { x: number; y: number },
  nodeSize: { width: number; height: number },
  roles?: CanvasGroup["role"][]
) => {
  const layout = buildPanelLayout(project);
  const centerX = nodePosition.x + nodeSize.width / 2;
  const centerY = nodePosition.y + nodeSize.height / 2;

  for (const [panelId, panel] of layout.panels) {
    const sourcePanel = project.canvasGroups.find((entry) => entry.id === panelId);
    if (!sourcePanel) {
      continue;
    }

    if (roles && !roles.includes(sourcePanel.role)) {
      continue;
    }
    const inside =
      centerX >= panel.position.x &&
      centerX <= panel.position.x + panel.size.width &&
      centerY >= panel.position.y &&
      centerY <= panel.position.y + panel.size.height;

    if (inside) return panelId;
  }

  return null;
};

const resolveGenericPanelMembership = (
  groups: CanvasGroup[],
  node: ConfigNode,
  nodePosition: { x: number; y: number }
) => {
  const center = getNodeCenter(nodePosition, getNodeDimensions(node));

  return groups
    .filter((group) => group.role === "generic")
    .filter((group) =>
      isPointInsideRect(center, {
        x: group.position.x,
        y: group.position.y,
        width: group.size.width,
        height: group.size.height
      })
    )
    .sort((left, right) => left.size.width * left.size.height - right.size.width * right.size.height)[0]?.id;
};

export const projectToFlowNodes = (project: ConfigProject, options: FlowOptions = {}): Node[] => {
  const panelLayout = buildPanelLayout(project);

  const panelNodes: Node[] = project.canvasGroups.map((panel) => {
    const layout = panelLayout.panels.get(panel.id)!;

    return {
      id: panel.id,
      type: "panel",
      position: layout.position,
      width: layout.size.width,
      height: layout.size.height,
      initialWidth: layout.size.width,
      initialHeight: layout.size.height,
      selectable: true,
      draggable: true,
      className: `flow-panel-node flow-panel-node--${panel.role}`,
      handles:
        panel.role === "rulePanel"
          ? [
              {
                id: `${panel.id}-panel-out`,
                type: "source" as const,
                position: Position.Left,
                x: 0,
                y: layout.size.height / 2 - 6,
                width: 12,
                height: 12
              }
            ]
          : [],
      data: { panel, onToggleEnabled: options.onTogglePanelEnabled }
    };
  });

  const configNodes: Node[] = project.nodes.map((node) => {
    const dimensions = getNodeDimensions(node);
    const layoutPosition =
      node.kind === "ruleSet" && node.canvasGroupId && panelLayout.rulePositions.has(node.id)
        ? panelLayout.rulePositions.get(node.id)!
        : node.position;

    return {
      id: node.id,
      type: "editor",
      position: layoutPosition,
      width: dimensions.width,
      height: dimensions.height,
      initialWidth: dimensions.width,
      initialHeight: dimensions.height,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      handles: getNodeHandles(node, dimensions),
      className: `flow-node flow-node--${node.kind}`,
      data: { node, onToggleEnabled: options.onToggleEnabled },
      zIndex: node.kind === "ruleSet" && node.canvasGroupId ? 20 : 10
    };
  });

  return [...panelNodes, ...configNodes];
};

const getSourceHandle = (edge: GraphEdge, project: ConfigProject) => {
  const sourcePanel = project.canvasGroups.find((panel) => panel.id === edge.source);
  if (sourcePanel?.role === "rulePanel") return `${edge.source}-panel-out`;
  const source = project.nodes.find((node) => node.id === edge.source);
  if (source?.kind === "ruleSet") return `${edge.source}-rule-out`;
  if (source?.kind === "proxyGroup") return `${edge.source}-group-out`;
  return `${edge.source}-source-out`;
};

const getTargetHandle = (edge: GraphEdge) =>
  edge.kind === "ruleset-target" ? `${edge.target}-rule-in` : `${edge.target}-source-in`;

export const projectToFlowEdges = (project: ConfigProject): Edge[] =>
  project.edges
    .filter((edge) => {
      const source = project.nodes.find((node) => node.id === edge.source) ??
        project.canvasGroups.find((panel) => panel.id === edge.source);
      const target = project.nodes.find((node) => node.id === edge.target);
      return source && target;
    })
    .map((edge) => {
      const sourceNode = project.nodes.find((node) => node.id === edge.source);
      const sourcePanel = project.canvasGroups.find((panel) => panel.id === edge.source);
      const target = project.nodes.find((node) => node.id === edge.target)!;
      const muted = (sourceNode?.enabled === false) || target.enabled === false;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: getSourceHandle(edge, project),
        targetHandle: getTargetHandle(edge),
        animated: edge.kind === "ruleset-target" && !muted,
        zIndex: 1000,
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        type: "bezier",
        style: {
          stroke: muted ? "#94a3b8" : edge.kind === "ruleset-target" ? "#f97316" : "#2563eb",
          strokeWidth: edge.kind === "ruleset-target" ? 3 : 2.5,
          opacity: muted ? 0.45 : 1
        }
      };
    });

export const applyNodePositions = (project: ConfigProject, nodes: Node[]): ConfigProject => {
  const groupPositionChanges = new Map<string, { dx: number; dy: number }>();
  const nextGroups: CanvasGroup[] = project.canvasGroups.map((group) => {
    const match = nodes.find((node) => node.id === group.id);
    if (!match) return group;

    groupPositionChanges.set(group.id, {
      dx: match.position.x - group.position.x,
      dy: match.position.y - group.position.y
    });

    return {
      ...group,
      position: match.position,
      size:
        group.role === "generic"
          ? {
              width: Math.max(match.width ?? group.size.width, GENERIC_PANEL_MIN_WIDTH),
              height: Math.max(match.height ?? group.size.height, GENERIC_PANEL_MIN_HEIGHT)
            }
          : group.size
    };
  });

  const shiftedNodes: ConfigNode[] = project.nodes.map((entry) => {
    const match = nodes.find((node) => node.id === entry.id);
    const parentGroup = entry.canvasGroupId
      ? nextGroups.find((group) => group.id === entry.canvasGroupId)
      : undefined;

    if (!match) {
      if (
        entry.canvasGroupId &&
        groupPositionChanges.has(entry.canvasGroupId) &&
        nextGroups.find((group) => group.id === entry.canvasGroupId)?.enabled !== false
      ) {
        const delta = groupPositionChanges.get(entry.canvasGroupId)!;
        return {
          ...entry,
          position: {
            x: entry.position.x + delta.dx,
            y: entry.position.y + delta.dy
          }
        };
      }
      return entry;
    }
    return {
      ...entry,
      position:
        entry.canvasGroupId && parentGroup?.role === "rulePanel"
          ? entry.position
          : entry.canvasGroupId &&
              groupPositionChanges.has(entry.canvasGroupId) &&
              parentGroup?.enabled !== false &&
              match.position.x === entry.position.x &&
              match.position.y === entry.position.y
            ? {
                x: entry.position.x + groupPositionChanges.get(entry.canvasGroupId)!.dx,
                y: entry.position.y + groupPositionChanges.get(entry.canvasGroupId)!.dy
              }
            : match.position
    };
  });

  const nextNodes: ConfigNode[] = shiftedNodes.map((entry) => {
    const parentGroup = entry.canvasGroupId
      ? nextGroups.find((group) => group.id === entry.canvasGroupId)
      : undefined;

    if (parentGroup?.role === "rulePanel") {
      return entry;
    }

    return {
      ...entry,
      canvasGroupId: resolveGenericPanelMembership(nextGroups, entry, entry.position)
    };
  });

  return {
    ...project,
    nodes: nextNodes,
    canvasGroups: nextGroups,
    meta: { ...project.meta, updatedAt: new Date().toISOString() }
  };
};

export const removeNodeAndEdges = (project: ConfigProject, nodeId: string): ConfigProject => ({
  ...project,
  nodes: project.nodes.filter((node) => node.id !== nodeId),
  edges: project.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
  meta: { ...project.meta, updatedAt: new Date().toISOString() }
});

export const removeCanvasGroup = (project: ConfigProject, groupId: string): ConfigProject => ({
  ...project,
  canvasGroups: project.canvasGroups.filter((group) => group.id !== groupId),
  nodes: project.nodes.map((node) =>
    node.canvasGroupId === groupId ? { ...node, canvasGroupId: undefined } : node
  ),
  edges: project.edges.filter((edge) => edge.source !== groupId && edge.target !== groupId),
  meta: { ...project.meta, updatedAt: new Date().toISOString() }
});

export const removeEdge = (project: ConfigProject, edgeId: string): ConfigProject => ({
  ...project,
  edges: project.edges.filter((edge) => edge.id !== edgeId),
  meta: { ...project.meta, updatedAt: new Date().toISOString() }
});

export const addEdgeToProject = (project: ConfigProject, edge: GraphEdge): ConfigProject => ({
  ...project,
  edges: [
    ...project.edges.filter(
      (item) => !(item.source === edge.source && item.target === edge.target && item.kind === edge.kind)
    ),
    edge
  ],
  meta: { ...project.meta, updatedAt: new Date().toISOString() }
});
