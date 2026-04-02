import type { ConfigNode } from "@clash-configuratoe/schema";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import type { MouseEvent as ReactMouseEvent } from "react";

type EditorData = {
  node: ConfigNode;
  onToggleEnabled?: (nodeId: string, nextEnabled: boolean) => void;
};

type PanelData = {
  panel: { id: string; label: string; role: "generic" | "rulePanel"; enabled?: boolean };
  onToggleEnabled?: (panelId: string, nextEnabled: boolean) => void;
  onResize?: (panelId: string, size: { width: number; height: number }) => void;
  onResizeEnd?: (panelId: string, size: { width: number; height: number }) => void;
};

const kindTitles: Record<ConfigNode["kind"], string> = {
  proxyProvider: "Source",
  manualProxy: "Manual",
  sourceMerge: "Merge",
  proxyGroup: "Group",
  ruleSet: "Rules",
  globalSettings: "Global"
};

const nodeColors: Record<ConfigNode["kind"], string> = {
  proxyProvider: "#d1fae5",
  manualProxy: "#fee2e2",
  sourceMerge: "#e0e7ff",
  proxyGroup: "#dbeafe",
  ruleSet: "#fef3c7",
  globalSettings: "#e2e8f0"
};

const getMainLabel = (node: ConfigNode) => {
  if (node.kind === "proxyGroup") return node.group.name;
  if (node.kind === "manualProxy") return node.proxy.name;
  if (node.kind === "ruleSet") return node.ruleSet.name;
  return node.label;
};

const getMeta = (node: ConfigNode) => {
  switch (node.kind) {
    case "proxyProvider":
      return node.providerKey;
    case "manualProxy":
      return `${node.proxy.server}:${node.proxy.port}`;
    case "sourceMerge":
      return node.merge.filterEnabled
        ? `${node.merge.invert ? "keep" : "hide"}: ${node.merge.filterTerms.join(", ")}`
        : "combine upstream sources";
    case "proxyGroup":
      return node.group.autoSelect ? `auto, ping <= ${node.group.tolerance}` : "manual select";
    case "ruleSet":
      return `${countRuleEntries(node)} conditions`;
    case "globalSettings":
      return `update ${node.settings.sourceUpdateInterval}s / ping ${node.settings.sourceHealthCheckInterval}s`;
  }
};

const countRuleEntries = (node: Extract<ConfigNode, { kind: "ruleSet" }>) =>
  node.ruleSet.domains.length +
  node.ruleSet.domainSuffixes.length +
  node.ruleSet.domainKeywords.length +
  node.ruleSet.geosites.length +
  node.ruleSet.geoips.length +
  node.ruleSet.processNames.length +
  node.ruleSet.ipCidrs.length +
  node.ruleSet.rawRules.length +
  (node.ruleSet.match ? 1 : 0);

export const EditorNode = ({ data }: NodeProps) => {
  const payload = data as EditorData;
  const node = payload.node;
  const isRuleBrick = node.kind === "ruleSet" && !!node.canvasGroupId;

  return (
    <div
      className={`editor-node editor-node--${node.kind} ${isRuleBrick ? "editor-node--rule-brick" : ""} ${node.enabled === false ? "editor-node--disabled" : ""}`}
      style={{ background: node.color ?? nodeColors[node.kind] }}
    >
      {node.kind === "proxyGroup" ? (
        <>
          <Handle
            id={`${node.id}-source-in`}
            className="editor-node__handle editor-node__handle--source-in"
            type="target"
            position={Position.Left}
            style={{ top: "50%" }}
          />
          <Handle
            id={`${node.id}-rule-in`}
            className="editor-node__handle editor-node__handle--rules-in"
            type="target"
            position={Position.Right}
            style={{ top: "50%" }}
          />
          <Handle
            id={`${node.id}-group-out`}
            className="editor-node__handle editor-node__handle--group-out"
            type="source"
            position={Position.Left}
            style={{ top: "calc(100% - 28px)" }}
          />
        </>
      ) : null}

      {node.kind === "proxyProvider" || node.kind === "manualProxy" || node.kind === "sourceMerge" ? (
        <>
          {node.kind === "sourceMerge" ? (
            <Handle
              id={`${node.id}-source-in`}
              className="editor-node__handle editor-node__handle--source-in"
              type="target"
              position={Position.Left}
              style={{ top: "50%" }}
            />
          ) : null}
          <Handle
            id={`${node.id}-source-out`}
            className="editor-node__handle editor-node__handle--source-out"
            type="source"
            position={Position.Right}
            style={{ top: "50%" }}
          />
        </>
      ) : null}

      {node.kind === "ruleSet" && !node.canvasGroupId ? (
        <Handle
          id={`${node.id}-rule-out`}
          className="editor-node__handle editor-node__handle--rules-out"
          type="source"
          position={Position.Left}
          style={{ top: "50%" }}
        />
      ) : null}

      <strong className="editor-node__label">{getMainLabel(node)}</strong>
      <div className="editor-node__bubble">{kindTitles[node.kind]}</div>
      {!isRuleBrick && node.comment ? <p className="node-meta">{node.comment}</p> : null}
      <div className="node-meta">{isRuleBrick ? `${countRuleEntries(node)} conditions` : getMeta(node)}</div>
      {node.kind === "proxyGroup" ? (
        <>
          <div className="editor-node__ports">
            <span>source in</span>
            <span>rule in</span>
          </div>
          <div className="editor-node__port-note">group out</div>
        </>
      ) : null}
      <label className="editor-node__enabled">
        <input
          type="checkbox"
          checked={node.enabled !== false}
          onChange={(event) => payload.onToggleEnabled?.(node.id, event.target.checked)}
          onClick={(event) => event.stopPropagation()}
        />
      </label>
    </div>
  );
};

export const PanelNode = ({ data, selected, width, height }: NodeProps) => {
  const payload = data as PanelData;
  const reactFlow = useReactFlow();

  const handleResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (payload.panel.role !== "generic") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startWidth = width ?? 240;
    const startHeight = height ?? 180;
    const startX = event.clientX;
    const startY = event.clientY;

    const handleMove = (moveEvent: MouseEvent) => {
      const zoom = reactFlow.getZoom() || 1;
      const nextWidth = Math.max(240, startWidth + (moveEvent.clientX - startX) / zoom);
      const nextHeight = Math.max(180, startHeight + (moveEvent.clientY - startY) / zoom);
      payload.onResize?.(payload.panel.id, {
        width: nextWidth,
        height: nextHeight
      });
    };

    const handleEnd = (endEvent: MouseEvent) => {
      const zoom = reactFlow.getZoom() || 1;
      const nextWidth = Math.max(240, startWidth + (endEvent.clientX - startX) / zoom);
      const nextHeight = Math.max(180, startHeight + (endEvent.clientY - startY) / zoom);
      payload.onResizeEnd?.(payload.panel.id, {
        width: nextWidth,
        height: nextHeight
      });
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd, { once: true });
  };

  return (
    <div
      className={`rule-panel-node ${payload.panel.enabled === false ? "rule-panel-node--disabled" : ""}`}
    >
      {payload.panel.role === "generic" ? (
        <div
          className={`rule-panel-node__resize nodrag nopan ${selected ? "rule-panel-node__resize--selected" : ""}`}
          onMouseDown={handleResizeStart}
        >
          <div className="rule-panel-node__resize-grip" />
        </div>
      ) : null}
      {payload.panel.role === "rulePanel" ? (
        <Handle
          id={`${payload.panel.id}-panel-out`}
          className="editor-node__handle editor-node__handle--rules-out"
          type="source"
          position={Position.Left}
          style={{ top: "50%" }}
        />
      ) : null}
      <div className="rule-panel-node__title">{payload.panel.label}</div>
      {payload.panel.role === "generic" ? (
        <label className="rule-panel-node__enabled">
          <input
            type="checkbox"
            checked={payload.panel.enabled !== false}
            onChange={(event) => payload.onToggleEnabled?.(payload.panel.id, event.target.checked)}
            onClick={(event) => event.stopPropagation()}
          />
        </label>
      ) : null}
    </div>
  );
};
