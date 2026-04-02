import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowInstance,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  getVisibleRuleSections,
  transliterateLabel,
  type CanvasGroup,
  type ConfigNode,
  type ConfigProject,
  type RuleSetNode,
  type ProxyProviderNode
} from "@clash-configuratoe/schema";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { EditorNode, PanelNode } from "@/features/editor/nodeTypes";
import {
  applyNodePositions,
  findOverlappingPanel,
  moveGenericPanelChildrenInFlow,
  projectToFlowEdges,
  projectToFlowNodes,
  removeCanvasGroup,
  removeEdge,
  removeNodeAndEdges
} from "@/features/editor/flow";
import { useEditorProject } from "@/features/editor/useEditorProject";
import { loadPublishedProject, loadPublishedYaml } from "@/shared/publish";
import { inspectSource, type SourceInspectResult } from "@/shared/sourceInspect";

const search = new URLSearchParams(window.location.search);
const published = search.get("published");
const publishedToken = search.get("token");
const yamlViewId = search.get("id");
const yamlViewMode = search.get("view");

const nodeTypes = {
  editor: EditorNode,
  panel: PanelNode
} as const;

const nodeKinds: ConfigNode["kind"][] = [
  "globalSettings",
  "proxyProvider",
  "manualProxy",
  "sourceMerge",
  "proxyGroup",
  "ruleSet"
];

const ruleSectionLabels: Record<RuleSectionKey, string> = {
  domains: "Domains",
  domainSuffixes: "Domain suffixes",
  domainKeywords: "Domain keywords",
  geosites: "Geosite",
  geoips: "GeoIP",
  processNames: "Process names",
  ipCidrs: "IP CIDR",
  rawRules: "Raw rules",
  match: "MATCH fallback"
};

type RuleSectionKey = RuleSetNode["ruleSet"]["visibleSections"][number];

const parseLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const listValue = (items?: string[]) => (items ? items.join("\n") : "");

const arrayRuleKeys: Exclude<RuleSectionKey, "match">[] = [
  "domains",
  "domainSuffixes",
  "domainKeywords",
  "geosites",
  "geoips",
  "processNames",
  "ipCidrs",
  "rawRules"
];

const slugifyFilePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "clash-config";

const downloadJsonProject = (project: ConfigProject) => {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json; charset=utf-8"
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${slugifyFilePart(project.name)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

export const App = () => {
  const [remoteYamlView, setRemoteYamlView] = useState<string | null>(null);
  const [remotePublishedProject, setRemotePublishedProject] = useState<ConfigProject | null>(null);
  const [loadingPublished, setLoadingPublished] = useState(
    Boolean((published && publishedToken) || (yamlViewMode === "yaml" && yamlViewId && publishedToken))
  );

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        if (yamlViewMode === "yaml" && yamlViewId && publishedToken) {
          const yaml = await loadPublishedYaml(yamlViewId, publishedToken);
          if (active) {
            setRemoteYamlView(yaml);
          }
          return;
        }

        if (published && publishedToken) {
          const project = await loadPublishedProject(published, publishedToken);
          if (active) {
            setRemotePublishedProject(project);
          }
        }
      } finally {
        if (active) {
          setLoadingPublished(false);
        }
      }
    };

    if ((published && publishedToken) || (yamlViewMode === "yaml" && yamlViewId && publishedToken)) {
      void hydrate();
    } else {
      setLoadingPublished(false);
    }

    return () => {
      active = false;
    };
  }, []);

  if (loadingPublished) {
    return <main className="yaml-view"><pre>Loading...</pre></main>;
  }

  if (remoteYamlView) {
    return (
      <main className="yaml-view">
        <div className="yaml-view__header">
          <h1>Published YAML</h1>
          <a href="/">Back to editor</a>
        </div>
        <pre>{remoteYamlView}</pre>
      </main>
    );
  }

  return (
    <ReactFlowProvider>
      <EditorShell initialProject={remotePublishedProject} />
    </ReactFlowProvider>
  );
};

const EditorShell = ({ initialProject }: { initialProject: ConfigProject | null }) => {
  const {
    project,
    setProject,
    addNode,
    addNodeAt,
    addCanvasGroupAt,
    updateNode,
    updateCanvasGroup,
    yamlPreview,
    yamlPreviewStatus,
    validationIssues,
    yamlImport,
    setYamlImport,
    importYaml,
    publish,
    publishArtifact,
    resetToDemo,
    connectNodes,
    applyPreset,
    duplicateNode,
    duplicateCanvasGroup,
    workspaceSession,
    workspaceIndex,
    workspaceStatus,
    workspaceError,
    authDraft,
    setAuthDraft,
    signIn,
    signOut,
    selectWorkspaceProject,
    createWorkspaceProject,
    duplicateWorkspaceProject,
    deleteWorkspaceCurrentProject
  } = useEditorProject(initialProject);
  const [selectedId, setSelectedId] = useState<string | null>(project.nodes[0]?.id ?? null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(project.canvasGroups[0]?.id ?? null);
  const [yamlPreviewExpanded, setYamlPreviewExpanded] = useState(false);
  const [sourceInspect, setSourceInspect] = useState<{
    node: ProxyProviderNode;
    status: "idle" | "loading" | "ready" | "error";
    data: SourceInspectResult | null;
    error: string | null;
  } | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [contextMenu, setContextMenu] = useState<
    | {
        mode: "actions";
        id: string;
        kind: "node" | "panel";
        x: number;
        y: number;
      }
    | {
        mode: "create";
        x: number;
        y: number;
        flowPosition: { x: number; y: number };
        canvasGroupId?: string;
      }
    | null
  >(null);

  const setNodeEnabled = (nodeId: string, nextEnabled: boolean) => {
    updateNode(nodeId, (node) => ({ ...node, enabled: nextEnabled }));
  };

  const setPanelEnabled = (panelId: string, nextEnabled: boolean) => {
    updateCanvasGroup(panelId, (group) => ({ ...group, enabled: nextEnabled }));
  };

  const nodes = useMemo(
    () =>
      projectToFlowNodes(project, {
        onToggleEnabled: setNodeEnabled,
        onTogglePanelEnabled: setPanelEnabled,
        onPanelResize: handleGenericPanelResize,
        onPanelResizeEnd: commitGenericPanelResize
      }),
    [project]
  );
  const [flowNodes, setFlowNodes] = useState(nodes);
  const flowNodesRef = useRef(nodes);
  const edges = useMemo(() => projectToFlowEdges(project), [project]);
  const selectedNode = project.nodes.find((node) => node.id === selectedId) ?? null;
  const selectedGroup = project.canvasGroups.find((group) => group.id === selectedGroupId) ?? null;
  const globalSettingsNode = project.nodes.find((node) => node.kind === "globalSettings") ?? null;
  const starterCounts = {
    providers: project.nodes.filter((node) => node.kind === "proxyProvider").length,
    merges: project.nodes.filter((node) => node.kind === "sourceMerge").length,
    panels: project.canvasGroups.filter((group) => group.role === "rulePanel").length,
    groups: project.nodes.filter((node) => node.kind === "proxyGroup").length,
    rulesets: project.nodes.filter((node) => node.kind === "ruleSet").length
  };

  const handleNodeChange = (nodeId: string, next: ConfigNode) => {
    setProject((current) => {
      const nextNodes = current.nodes.map((entry) => {
        if (entry.id !== nodeId) {
          if (
            next.kind === "proxyGroup" &&
            next.group.catchAll &&
            entry.kind === "proxyGroup"
          ) {
            return {
              ...entry,
              group: {
                ...entry.group,
                catchAll: false
              }
            };
          }
          return entry;
        }

        return next;
      });

      return {
        ...current,
        nodes: nextNodes,
        meta: { ...current.meta, updatedAt: new Date().toISOString() }
      };
    });
  };

  useEffect(() => {
    setFlowNodes(nodes);
    flowNodesRef.current = nodes;
  }, [nodes]);

  function updateFlowPanelSize(panelId: string, size: { width: number; height: number }) {
    setFlowNodes((currentFlowNodes) => {
      const nextFlowNodes = currentFlowNodes.map((entry) =>
        entry.id === panelId
          ? {
              ...entry,
              width: Math.max(size.width, 240),
              height: Math.max(size.height, 180),
              style: {
                ...(typeof entry.style === "object" && entry.style ? entry.style : {}),
                width: Math.max(size.width, 240),
                height: Math.max(size.height, 180)
              },
              measured: {
                width: Math.max(size.width, 240),
                height: Math.max(size.height, 180)
              }
            }
          : entry
      );
      flowNodesRef.current = nextFlowNodes;
      return nextFlowNodes;
    });
  }

  function handleGenericPanelResize(panelId: string, size: { width: number; height: number }) {
    updateFlowPanelSize(panelId, size);
  }

  function commitGenericPanelResize(panelId: string, size: { width: number; height: number }) {
    updateFlowPanelSize(panelId, size);
    const nextFlowNodes = flowNodesRef.current;
    setProject((current) => applyNodePositions(current, nextFlowNodes));
  }

  const onNodesChange = (changes: NodeChange[]) => {
    setFlowNodes((currentFlowNodes) => {
      const panelDragDeltas = changes.reduce<Array<{ panelId: string; dx: number; dy: number }>>(
        (accumulator, change) => {
          if (change.type !== "position" || !("position" in change) || !change.position) {
            return accumulator;
          }

          const isGenericPanelMove = project.canvasGroups.some(
            (group) =>
              group.id === change.id &&
              group.role === "generic" &&
              group.enabled !== false
          );

          if (!isGenericPanelMove) {
            return accumulator;
          }

          const previousPanelNode = currentFlowNodes.find((entry) => entry.id === change.id);
          if (!previousPanelNode) {
            return accumulator;
          }

          accumulator.push({
            panelId: change.id,
            dx: change.position.x - previousPanelNode.position.x,
            dy: change.position.y - previousPanelNode.position.y
          });

          return accumulator;
        },
        []
      ).filter((delta) => !!delta.dx || !!delta.dy);

      let nextFlowNodes = applyNodeChanges(changes, currentFlowNodes);

      for (const delta of panelDragDeltas) {
        nextFlowNodes = moveGenericPanelChildrenInFlow(nextFlowNodes, project, delta.panelId, {
          dx: delta.dx,
          dy: delta.dy
        });
      }

      flowNodesRef.current = nextFlowNodes;
      const isIntermediateResize = changes.some(
        (change) => change.type === "dimensions" && change.resizing
      );
      const hasFinalResize = changes.some(
        (change) => change.type === "dimensions" && !change.resizing
      );
      const hasPanelPositionChange = changes.some(
        (change) =>
          change.type === "position" &&
          project.canvasGroups.some((group) => group.id === change.id)
      );

      if (!isIntermediateResize && !hasFinalResize && !hasPanelPositionChange) {
        setProject((currentProject) => applyNodePositions(currentProject, nextFlowNodes));
      }

      if (hasFinalResize) {
        setProject((currentProject) => applyNodePositions(currentProject, nextFlowNodes));
      }

      return nextFlowNodes;
    });
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    const removed = changes.find((change) => change.type === "remove");
    if (removed?.id) {
      setProject(removeEdge(project, removed.id));
      return;
    }

    setProject((current) => {
      const next = applyEdgeChanges(changes, projectToFlowEdges(current));
      return {
        ...current,
        edges: next.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          kind:
            current.edges.find((item) => item.id === edge.id)?.kind ??
            (current.nodes.find((item) => item.id === edge.source)?.kind === "ruleSet"
              ? "ruleset-target"
              : "group-source")
        })),
        meta: {
          ...current.meta,
          updatedAt: new Date().toISOString()
        }
      };
    });
  };

  const onConnect = (connection: Connection) => {
    if (connection.source && connection.target) {
      connectNodes(connection.source, connection.target);
    }
  };

  const onEdgeDoubleClick = (_event: MouseEvent, edge: Edge) => {
    setProject((current) => removeEdge(current, edge.id));
  };

  const onNodeDragStop = (_event: MouseEvent, node: { id: string; position: { x: number; y: number } }) => {
    const draggedPanel = project.canvasGroups.find((entry) => entry.id === node.id);
    if (draggedPanel) {
      const nextFlowNodes = flowNodesRef.current.map((entry) =>
        entry.id === node.id
          ? {
              ...entry,
              position: node.position
            }
          : entry
      );
      flowNodesRef.current = nextFlowNodes;
      setFlowNodes(nextFlowNodes);
      setProject((current) => applyNodePositions(current, nextFlowNodes));
      return;
    }

    const configNode = project.nodes.find((entry) => entry.id === node.id);
    if (!configNode) {
      return;
    }

    const dragged = project.nodes.find((entry) => entry.id === node.id);
    if (!dragged) return;

    const panelRoles: CanvasGroup["role"][] =
      dragged.kind === "ruleSet" ? ["rulePanel", "generic"] : ["generic"];
    const panelId = findOverlappingPanel(
      project,
      node.position,
      {
        width: 250,
        height: dragged.kind === "ruleSet" ? 148 : 118
      },
      panelRoles
    );

    handleNodeChange(configNode.id, {
      ...configNode,
      canvasGroupId: panelId ?? undefined,
      position: node.position
    });
  };

  const openSourceInspect = async (node: ProxyProviderNode) => {
    setSourceInspect({
      node,
      status: "loading",
      data: null,
      error: null
    });

    try {
      const data = await inspectSource(node.subscriptionUrl, {
        runProbe: false
      });
      setSourceInspect({
        node,
        status: "ready",
        data,
        error: null
      });
    } catch (error) {
      setSourceInspect({
        node,
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Failed to load source list."
      });
    }
  };

  const runSourceInspect = async (node: ProxyProviderNode) => {
    setSourceInspect((current) => ({
      node,
      status: "loading",
      data: current?.node.id === node.id ? current.data : null,
      error: null
    }));

    try {
      const data = await inspectSource(node.subscriptionUrl, {
        runProbe: true,
        probeUrl:
          globalSettingsNode?.kind === "globalSettings"
            ? globalSettingsNode.settings.healthCheckUrl
            : undefined
      });
      setSourceInspect({
        node,
        status: "ready",
        data,
        error: null
      });
    } catch (error) {
      setSourceInspect({
        node,
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Failed to inspect source."
      });
    }
  };

  const deleteSelection = () => {
    if (selectedNode) {
      setProject(removeNodeAndEdges(project, selectedNode.id));
      setSelectedId(null);
      setContextMenu(null);
      return;
    }

    if (selectedGroup) {
      setProject(removeCanvasGroup(project, selectedGroup.id));
      setSelectedGroupId(null);
      setContextMenu(null);
    }
  };

  const deleteById = (id: string, kind: "node" | "panel") => {
    if (kind === "node") {
      setProject((current) => removeNodeAndEdges(current, id));
      if (selectedId === id) setSelectedId(null);
    } else {
      setProject((current) => removeCanvasGroup(current, id));
      if (selectedGroupId === id) setSelectedGroupId(null);
    }
    setContextMenu(null);
  };

  const duplicateById = (id: string, kind: "node" | "panel") => {
    if (kind === "node") {
      duplicateNode(id);
    } else {
      duplicateCanvasGroup(id);
    }
    setContextMenu(null);
  };

  const exportProjectJson = () => {
    downloadJsonProject(project);
  };

  const createAtMenuPoint = (kind: ConfigNode["kind"] | "genericPanel" | "rulePanel") => {
    if (!contextMenu || contextMenu.mode !== "create") {
      return;
    }

    if (kind === "genericPanel" || kind === "rulePanel") {
      addCanvasGroupAt(kind === "rulePanel" ? "rulePanel" : "generic", contextMenu.flowPosition);
      setContextMenu(null);
      return;
    }

    addNodeAt(kind, contextMenu.flowPosition, contextMenu.canvasGroupId);
    setContextMenu(null);
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Static-first Clash Verge Builder</div>
          <h1>Build and publish Clash configs visually.</h1>
          <p>
            Merge sources, route rules through panels, and keep the final YAML clean without
            hand-editing raw config files.
          </p>
        </div>
        <div className="hero-actions">
          <button onClick={() => void publish()}>
            {workspaceSession ? "Refresh stable publish link" : "Publish snapshot"}
          </button>
          <button className="ghost" onClick={resetToDemo}>
            Reset Demo
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <section className="panel">
            <h2>Workspace Access</h2>
            {workspaceSession ? (
              <>
                <p>
                  Signed in as <strong>{workspaceSession.userName}</strong>.
                </p>
                <p className="node-meta">
                  Weak privacy only: access is restored from your local session and knowledge of
                  user name + code.
                </p>
                <button className="secondary" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <div className="inspector-form">
                <label>
                  User name
                  <input
                    value={authDraft.userName}
                    onChange={(event) =>
                      setAuthDraft((current) => ({ ...current, userName: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Access code
                  <input
                    type="password"
                    value={authDraft.code}
                    onChange={(event) =>
                      setAuthDraft((current) => ({ ...current, code: event.target.value }))
                    }
                  />
                </label>
                <button onClick={() => void signIn()}>
                  {workspaceStatus === "loading" ? "Restoring..." : "Sign in / Restore"}
                </button>
                <p className="node-meta">
                  This is a lightweight hash-based workspace lock, not full authentication.
                </p>
              </div>
            )}
            {workspaceError ? <p className="issue-text">{workspaceError}</p> : null}
          </section>

          <section className="panel">
            <h2>Projects</h2>
            {workspaceSession && workspaceIndex ? (
              <div className="project-list">
                <button className="secondary" onClick={() => void createWorkspaceProject()}>
                  Create new
                </button>
                {workspaceIndex.projects.map((workspaceProject) => (
                  <div
                    key={workspaceProject.id}
                    className={`project-row ${workspaceIndex.activeProjectId === workspaceProject.id ? "project-row--active" : ""}`}
                  >
                    <button
                      className="ghost project-row__select"
                      onClick={() => void selectWorkspaceProject(workspaceProject.id)}
                    >
                      <strong>{workspaceProject.name}</strong>
                      <span>{new Date(workspaceProject.updatedAt).toLocaleString()}</span>
                    </button>
                    <div className="project-row__actions">
                      <button className="ghost" onClick={() => void duplicateWorkspaceProject(workspaceProject.id)}>
                        Clone
                      </button>
                      <button className="ghost" onClick={() => void deleteWorkspaceCurrentProject(workspaceProject.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Sign in to load your schemes from the workspace bucket.</p>
            )}
          </section>

          <section className="panel">
            <h2>Starter Scene</h2>
            <p>
              {workspaceSession
                ? "Your current project autosaves into workspace storage."
                : "Guest mode uses the local demo scene until you sign in."}
            </p>
            <div className="starter-stats">
              <span>{starterCounts.providers} providers</span>
              <span>{starterCounts.merges} merges</span>
              <span>{starterCounts.panels} rule panels</span>
              <span>{starterCounts.groups} groups</span>
              <span>{starterCounts.rulesets} rule nodes</span>
            </div>
            <button className="secondary" onClick={resetToDemo}>
              Reload starter scheme
            </button>
          </section>

          <section className="panel">
            <h2>Node Palette</h2>
            <div className="button-grid">
              {nodeKinds.map((kind) => (
                <button key={kind} onClick={() => addNode(kind)}>
                  Add {kind}
                </button>
              ))}
              <button className="secondary" onClick={() => addCanvasGroupAt("generic", { x: 80, y: 80 })}>
                Add visual panel
              </button>
              <button className="secondary" onClick={() => addCanvasGroupAt("rulePanel", { x: 120, y: 120 })}>
                Add rule panel
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>Presets</h2>
            <div className="preset-list">
              {[
                { id: "preset-ai", label: "AI Services" },
                { id: "preset-telegram", label: "Telegram" },
                { id: "preset-video", label: "Video" },
                { id: "preset-torrents", label: "Torrents" },
                { id: "preset-local-direct", label: "Local Direct" },
                { id: "preset-rest", label: "Rest Of World" }
              ].map((preset) => (
                <button key={preset.id} className="secondary" onClick={() => applyPreset(preset.id)}>
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Import YAML</h2>
            <textarea
              value={yamlImport}
              onChange={(event) => setYamlImport(event.target.value)}
              placeholder="Paste a Clash YAML file here"
            />
            <button onClick={importYaml}>Import into graph</button>
          </section>

          <section className="panel">
            <h2>Validation</h2>
            {validationIssues.length === 0 ? (
              <p className="ok">No graph issues detected.</p>
            ) : (
              <ul className="issue-list">
                {validationIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <main className="canvas-area">
          <div className="canvas-toolbar">
            {workspaceSession ? (
              <input
                className="project-name-input"
                value={project.name}
                onChange={(event) =>
                  setProject((current) => ({
                    ...current,
                    name: event.target.value,
                    meta: { ...current.meta, updatedAt: new Date().toISOString() }
                  }))
                }
              />
            ) : (
              <span>{project.name}</span>
            )}
            <div className="toolbar-actions">
              <button className="ghost" onClick={exportProjectJson}>
                Export JSON
              </button>
              <button className="ghost" onClick={deleteSelection}>
                Delete selected
              </button>
            </div>
          </div>
          <div className="flow-stage">
            <ReactFlow
              nodes={flowNodes}
              edges={edges}
              nodeTypes={nodeTypes as any}
              fitView
              minZoom={0.2}
              maxZoom={1.8}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              defaultEdgeOptions={{
                type: "bezier",
                markerEnd: { type: MarkerType.ArrowClosed }
              }}
              proOptions={{ hideAttribution: true }}
              onInit={(instance) => {
                setReactFlowInstance(instance);
                requestAnimationFrame(() => {
                  instance.fitView({ padding: 0.16, includeHiddenNodes: true });
                });
              }}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgeDoubleClick={onEdgeDoubleClick}
              onNodeDragStop={onNodeDragStop}
              onNodeContextMenu={(event, node) => {
                event.preventDefault();
                const isPanel = project.canvasGroups.some((entry) => entry.id === node.id);
                const panel = isPanel ? project.canvasGroups.find((entry) => entry.id === node.id) : null;
                if (panel?.role === "generic" && reactFlowInstance) {
                  setContextMenu({
                    mode: "create",
                    x: event.clientX,
                    y: event.clientY,
                    flowPosition: reactFlowInstance.screenToFlowPosition({
                      x: event.clientX,
                      y: event.clientY
                    }),
                    canvasGroupId: panel.id
                  });
                  return;
                }

                setContextMenu({
                  mode: "actions",
                  id: node.id,
                  kind: isPanel ? "panel" : "node",
                  x: event.clientX,
                  y: event.clientY
                });
              }}
              onPaneContextMenu={(event) => {
                event.preventDefault();
                if (!reactFlowInstance) {
                  return;
                }
                setContextMenu({
                  mode: "create",
                  x: event.clientX,
                  y: event.clientY,
                  flowPosition: reactFlowInstance.screenToFlowPosition({
                    x: event.clientX,
                    y: event.clientY
                  })
                });
              }}
              onPaneClick={() => {
                setSelectedId(null);
                setSelectedGroupId(null);
                setContextMenu(null);
              }}
              onNodeClick={(_, node) => {
                setContextMenu(null);
                if (project.nodes.some((entry) => entry.id === node.id)) {
                  setSelectedId(node.id);
                  setSelectedGroupId(null);
                } else if (project.canvasGroups.some((entry) => entry.id === node.id)) {
                  setSelectedGroupId(node.id);
                  setSelectedId(null);
                }
              }}
              onNodeDoubleClick={(_, node) => {
                const configNode = project.nodes.find((entry) => entry.id === node.id);
                if (configNode?.kind === "proxyProvider") {
                  void openSourceInspect(configNode);
                }
              }}
            >
              <Background gap={24} size={1.1} />
              <MiniMap />
              <Controls />
            </ReactFlow>
            {contextMenu?.mode === "actions" ? (
              <div className="canvas-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
                <button className="ghost" onClick={() => duplicateById(contextMenu.id, contextMenu.kind)}>
                  Clone
                </button>
                <button className="ghost" onClick={() => deleteById(contextMenu.id, contextMenu.kind)}>
                  Delete
                </button>
              </div>
            ) : null}
            {contextMenu?.mode === "create" ? (
              <div className="canvas-context-menu canvas-context-menu--create" style={{ left: contextMenu.x, top: contextMenu.y }}>
                <button className="ghost" onClick={() => createAtMenuPoint("globalSettings")}>Create global settings</button>
                <button className="ghost" onClick={() => createAtMenuPoint("proxyProvider")}>Create source</button>
                <button className="ghost" onClick={() => createAtMenuPoint("manualProxy")}>Create manual proxy</button>
                <button className="ghost" onClick={() => createAtMenuPoint("sourceMerge")}>Create merge</button>
                <button className="ghost" onClick={() => createAtMenuPoint("proxyGroup")}>Create proxy group</button>
                <button className="ghost" onClick={() => createAtMenuPoint("ruleSet")}>Create rule node</button>
                {!contextMenu.canvasGroupId ? (
                  <>
                    <button className="ghost" onClick={() => createAtMenuPoint("genericPanel")}>Create visual panel</button>
                    <button className="ghost" onClick={() => createAtMenuPoint("rulePanel")}>Create rule panel</button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </main>

        <aside className="inspector">
          <section className="panel">
            <h2>Inspector</h2>
            {selectedNode ? (
              <NodeInspector
                node={selectedNode}
                project={project}
                onChange={(next) => handleNodeChange(selectedNode.id, next)}
              />
            ) : selectedGroup ? (
              <CanvasGroupInspector
                group={selectedGroup}
                onChange={(next) => updateCanvasGroup(selectedGroup.id, () => next)}
              />
            ) : (
              <p>Select a node or panel on the canvas.</p>
            )}
          </section>

          <section className="panel">
            <button
              type="button"
              className="panel-title-button"
              onClick={() => setYamlPreviewExpanded(true)}
            >
              <h2>Published YAML Preview</h2>
              <span>
                {yamlPreviewStatus === "loading"
                  ? "Refreshing..."
                  : yamlPreviewStatus === "error"
                    ? "Preview fallback"
                    : "Open large view"}
              </span>
            </button>
            <pre className="yaml-preview">{yamlPreview}</pre>
          </section>

          <section className="panel">
            <h2>Publish Result</h2>
            {publishArtifact ? (
              <div className="publish-card">
                <p className="node-meta">
                  {workspaceSession
                    ? "Workspace projects keep one stable URL. Saving the project updates the YAML behind the same link."
                    : "Guest publish creates a standalone snapshot link."}
                </p>
                <p>
                  Secret-token link:
                  <br />
                  <a href={publishArtifact.shareUrl}>{publishArtifact.shareUrl}</a>
                </p>
                <p>
                  Raw YAML:
                  <br />
                  <a href={publishArtifact.yamlUrl}>{publishArtifact.yamlUrl}</a>
                </p>
                <img src={publishArtifact.qrPayload} alt="QR code for published config" />
              </div>
            ) : (
              <p>
                {workspaceSession
                  ? "Workspace projects get one stable publish URL. Open or scan it once, then update the same project to refresh clients."
                  : "Publish to generate a share link, YAML link, and QR code."}
              </p>
            )}
          </section>
        </aside>
      </div>
      {yamlPreviewExpanded ? (
        <div
          className="yaml-preview-modal"
          onClick={() => setYamlPreviewExpanded(false)}
          role="presentation"
        >
          <div
            className="yaml-preview-modal__dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Expanded YAML preview"
          >
            <div className="yaml-preview-modal__header">
              <h2>Published YAML Preview</h2>
              <button
                type="button"
                className="ghost"
                onClick={() => setYamlPreviewExpanded(false)}
              >
                Close
              </button>
            </div>
            <pre className="yaml-preview yaml-preview--expanded">{yamlPreview}</pre>
          </div>
        </div>
      ) : null}
      {sourceInspect ? (
        <div
          className="yaml-preview-modal"
          onClick={() => setSourceInspect(null)}
          role="presentation"
        >
          <div
            className="yaml-preview-modal__dialog source-inspect-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Source servers"
          >
            <div className="yaml-preview-modal__header">
              <div>
                <h2>{sourceInspect.node.label}</h2>
                <p className="node-meta">
                  Logical servers from the source subscription. Ping is measured by running the
                  current health-check URL through each proxy tunnel, including detour when one is
                  configured.
                </p>
                <p className="node-meta">
                  The site shows logical tunnel servers. Clash itself still sees wire-level helper
                  proxies because `dialer-proxy` requires real helper entries in the generated YAML.
                </p>
              </div>
              <div className="yaml-preview-modal__actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void runSourceInspect(sourceInspect.node)}
                  disabled={sourceInspect.status === "loading"}
                >
                  {sourceInspect.status === "loading" ? "Running probe..." : "Run probe"}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setSourceInspect(null)}
                >
                  Close
                </button>
              </div>
            </div>
            {sourceInspect.status === "loading" ? (
              <p>{sourceInspect.data ? "Running probe..." : "Loading source servers..."}</p>
            ) : null}
            {sourceInspect.status === "error" ? (
              <p className="issue-text">{sourceInspect.error}</p>
            ) : null}
            {sourceInspect.status === "ready" && sourceInspect.data ? (
              <>
                <p className="node-meta">
                  {sourceInspect.data.total} logical servers
                  {sourceInspect.data.probeUrl ? ` • probe ${sourceInspect.data.probeUrl}` : ""}
                </p>
                <div className="source-inspect-grid">
                  {sourceInspect.data.proxies.map((proxy) => (
                    <article
                      key={`${proxy.name}-${proxy.server}-${proxy.port}`}
                      className={`source-inspect-card ${proxy.pingMs == null ? "source-inspect-card--muted" : ""}`}
                    >
                      <div className="source-inspect-card__top">
                        <strong>{proxy.name}</strong>
                        <span className="source-inspect-card__type">{proxy.type}</span>
                      </div>
                      <div className="source-inspect-card__host">{proxy.server}:{proxy.port}</div>
                      {proxy.detourServer ? (
                        <div className="source-inspect-card__host source-inspect-card__host--secondary">
                          Detour: {proxy.detourServer}:{proxy.detourPort}
                          {proxy.detourType ? ` (${proxy.detourType})` : ""}
                        </div>
                      ) : null}
                      <div className="source-inspect-card__metrics">
                        <div>
                          <span className="source-inspect-card__metric-label">Probe</span>
                          <strong>{proxy.pingMs == null ? "n/a" : `${proxy.pingMs} ms`}</strong>
                        </div>
                        <div>
                          <span className="source-inspect-card__metric-label">Status</span>
                          <strong>{proxy.status}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const NodeInspector = ({
  node,
  project,
  onChange
  }: {
    node: ConfigNode;
    project: ConfigProject;
    onChange: (next: ConfigNode) => void;
  }) => {
    const showGenericLabel = !["proxyGroup"].includes(node.kind);

  return (
    <div className="inspector-form">
      {showGenericLabel ? (
        <label>
          Label
          <input value={node.label} onChange={(event) => onChange({ ...node, label: event.target.value })} />
        </label>
      ) : null}
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={node.enabled !== false}
          onChange={(event) => onChange({ ...node, enabled: event.target.checked })}
        />
        Node active
      </label>
      <label>
        Comment
        <input
          value={node.comment ?? ""}
          onChange={(event) => onChange({ ...node, comment: event.target.value })}
        />
      </label>
      {node.kind === "globalSettings" ? <GlobalSettingsFields node={node} onChange={onChange} /> : null}
      {node.kind === "proxyProvider" ? <ProxyProviderFields node={node} onChange={onChange} /> : null}
      {node.kind === "manualProxy" ? <ManualProxyFields node={node} onChange={onChange} /> : null}
      {node.kind === "sourceMerge" ? <SourceMergeFields node={node} onChange={onChange} /> : null}
      {node.kind === "proxyGroup" ? <ProxyGroupFields node={node} onChange={onChange} /> : null}
      {node.kind === "ruleSet" ? <RuleSetFields node={node} onChange={onChange} /> : null}
    </div>
  );
};

const GlobalSettingsFields = ({
  node,
  onChange
}: {
  node: Extract<ConfigNode, { kind: "globalSettings" }>;
  onChange: (next: ConfigNode) => void;
}) => (
  <>
    <label>
      Source refresh interval
      <input
        type="number"
        value={node.settings.sourceUpdateInterval}
        onChange={(event) =>
          onChange({
            ...node,
            settings: { ...node.settings, sourceUpdateInterval: Number(event.target.value) }
          })
        }
      />
    </label>
    <label>
      Ping check interval
      <input
        type="number"
        value={node.settings.sourceHealthCheckInterval}
        onChange={(event) =>
          onChange({
            ...node,
            settings: { ...node.settings, sourceHealthCheckInterval: Number(event.target.value) }
          })
        }
      />
    </label>
    <label>
      Ping URL
      <input
        value={node.settings.healthCheckUrl}
        onChange={(event) =>
          onChange({
            ...node,
            settings: { ...node.settings, healthCheckUrl: event.target.value }
          })
        }
      />
    </label>
    <label>
      Formatter URL
      <input
        value={node.settings.formatterUrl ?? ""}
        onChange={(event) =>
          onChange({
            ...node,
            settings: {
              ...node.settings,
              formatterUrl: event.target.value || undefined
            }
          })
        }
      />
    </label>
  </>
);

const ProxyProviderFields = ({
  node,
  onChange
}: {
  node: Extract<ConfigNode, { kind: "proxyProvider" }>;
  onChange: (next: ConfigNode) => void;
}) => (
  <>
    <label>
      Provider key
      <input value={node.providerKey} onChange={(event) => onChange({ ...node, providerKey: event.target.value })} />
    </label>
    <label>
      Subscription URL
      <input
        value={node.subscriptionUrl}
        onChange={(event) => onChange({ ...node, subscriptionUrl: event.target.value })}
      />
    </label>
    <label className="checkbox-row">
      <input
        type="checkbox"
        checked={node.formatter.enabled}
        onChange={(event) =>
          onChange({
            ...node,
            formatter: {
              ...node.formatter,
              enabled: event.target.checked
            }
          })
        }
      />
      Use formatter
    </label>
    <label>
      Output path
      <input value={node.path} onChange={(event) => onChange({ ...node, path: event.target.value })} />
    </label>
  </>
);

const ManualProxyFields = ({
  node,
  onChange
}: {
  node: Extract<ConfigNode, { kind: "manualProxy" }>;
  onChange: (next: ConfigNode) => void;
}) => (
  <>
    <label>
      Proxy name
      <input
        value={node.proxy.name}
        onChange={(event) => onChange({ ...node, proxy: { ...node.proxy, name: event.target.value } })}
      />
    </label>
    <label>
      Server
      <input
        value={node.proxy.server}
        onChange={(event) => onChange({ ...node, proxy: { ...node.proxy, server: event.target.value } })}
      />
    </label>
    <label>
      Port
      <input
        type="number"
        value={node.proxy.port}
        onChange={(event) =>
          onChange({
            ...node,
            proxy: { ...node.proxy, port: Number(event.target.value) }
          })
        }
      />
    </label>
    <label>
      Username
      <input
        value={node.proxy.username ?? ""}
        onChange={(event) =>
          onChange({
            ...node,
            proxy: { ...node.proxy, username: event.target.value }
          })
        }
      />
    </label>
    <label>
      Password
      <input
        type="password"
        value={node.proxy.password ?? ""}
        onChange={(event) =>
          onChange({
            ...node,
            proxy: { ...node.proxy, password: event.target.value }
          })
        }
      />
    </label>
  </>
);

const SourceMergeFields = ({
  node,
  onChange
}: {
  node: Extract<ConfigNode, { kind: "sourceMerge" }>;
  onChange: (next: ConfigNode) => void;
}) => (
  <>
    <label>
      Merge label
      <input value={node.label} onChange={(event) => onChange({ ...node, label: event.target.value })} />
    </label>
    <label className="checkbox-row">
      <input
        type="checkbox"
        checked={node.merge.filterEnabled}
        onChange={(event) =>
          onChange({
            ...node,
            merge: {
              ...node.merge,
              filterEnabled: event.target.checked,
              filterTerms: event.target.checked ? node.merge.filterTerms : [],
              invert: event.target.checked ? node.merge.invert : false
            }
          })
        }
      />
      Filter
    </label>
    {node.merge.filterEnabled ? (
      <>
        <label>
          Filter words
          <textarea
            value={listValue(node.merge.filterTerms)}
            onChange={(event) =>
              onChange({
                ...node,
                merge: { ...node.merge, filterTerms: parseLines(event.target.value) }
              })
            }
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={node.merge.invert}
            onChange={(event) =>
              onChange({
                ...node,
                merge: { ...node.merge, invert: event.target.checked }
              })
            }
          />
          Invert
        </label>
      </>
    ) : null}
  </>
);

const ProxyGroupFields = ({
  node,
  onChange
}: {
  node: Extract<ConfigNode, { kind: "proxyGroup" }>;
  onChange: (next: ConfigNode) => void;
}) => (
  <>
    <label>
      Group name
      <input
        value={node.group.name}
        onChange={(event) =>
          onChange({
            ...node,
            label: transliterateLabel(event.target.value),
            group: { ...node.group, name: event.target.value }
          })
        }
      />
    </label>
    <label className="checkbox-row">
      <input
        type="checkbox"
        checked={node.group.includeDirect}
        onChange={(event) =>
          onChange({ ...node, group: { ...node.group, includeDirect: event.target.checked } })
        }
      />
      Include DIRECT
    </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={node.group.autoSelect}
        onChange={(event) =>
          onChange({ ...node, group: { ...node.group, autoSelect: event.target.checked } })
        }
        />
        Auto select
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={node.group.catchAll}
          onChange={(event) =>
            onChange({ ...node, group: { ...node.group, catchAll: event.target.checked } })
          }
        />
        All
      </label>
      {node.group.autoSelect ? (
      <>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={node.group.customHealthCheckEnabled}
            onChange={(event) =>
              onChange({
                ...node,
                group: {
                  ...node.group,
                  customHealthCheckEnabled: event.target.checked
                }
              })
            }
          />
          Custom ping URL
        </label>
        {node.group.customHealthCheckEnabled ? (
          <label>
            Ping URL
            <input
              value={node.group.customHealthCheckUrl}
              onChange={(event) =>
                onChange({
                  ...node,
                  group: {
                    ...node.group,
                    customHealthCheckUrl: event.target.value
                  }
                })
              }
            />
          </label>
        ) : null}
        <label>
          Ping threshold
          <input
            type="number"
            value={node.group.tolerance}
            onChange={(event) =>
              onChange({ ...node, group: { ...node.group, tolerance: Number(event.target.value) } })
            }
          />
        </label>
      </>
    ) : null}
  </>
);

const RuleSetFields = ({
  node,
  onChange
}: {
  node: Extract<ConfigNode, { kind: "ruleSet" }>;
  onChange: (next: ConfigNode) => void;
}) => {
  const visibleSections = getVisibleRuleSections(node.ruleSet);
  const availableSections = (Object.keys(ruleSectionLabels) as RuleSectionKey[]).filter(
    (key) => !visibleSections.includes(key)
  );

  const updateVisibleSections = (sections: RuleSectionKey[]) =>
    onChange({
      ...node,
      ruleSet: {
        ...node.ruleSet,
        visibleSections: sections
      }
    });

  const updateArrayField = (key: Exclude<RuleSectionKey, "match">, value: string[]) =>
    onChange({
      ...node,
      ruleSet: {
        ...node.ruleSet,
        [key]: value
      }
    });

  return (
    <>
      <label>
        Rule block name
        <input
          value={node.ruleSet.name}
          onChange={(event) =>
            onChange({
              ...node,
              label: event.target.value,
              ruleSet: { ...node.ruleSet, name: event.target.value }
            })
          }
        />
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={node.ruleSet.first}
          onChange={(event) =>
            onChange({
              ...node,
              ruleSet: { ...node.ruleSet, first: event.target.checked }
            })
          }
        />
        First
      </label>

      {visibleSections.map((section) =>
        section === "match" ? (
          <label key={section} className="checkbox-row">
            <input
              type="checkbox"
              checked={node.ruleSet.match}
              onChange={(event) =>
                onChange({
                  ...node,
                  ruleSet: { ...node.ruleSet, match: event.target.checked }
                })
              }
            />
            {ruleSectionLabels[section]}
          </label>
        ) : (
          <label key={section}>
            {ruleSectionLabels[section]}
            <textarea
              value={listValue(node.ruleSet[section])}
              onChange={(event) => updateArrayField(section, parseLines(event.target.value))}
            />
          </label>
        )
      )}

      {availableSections.length > 0 ? (
        <label>
          Add rule section
          <select
            defaultValue=""
            onChange={(event) => {
              const section = event.target.value as RuleSectionKey;
              if (!section) return;
              updateVisibleSections([...visibleSections, section]);
              event.currentTarget.value = "";
            }}
          >
            <option value="">Select section…</option>
            {availableSections.map((section) => (
              <option key={section} value={section}>
                {ruleSectionLabels[section]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
};

const CanvasGroupInspector = ({
  group,
  onChange
}: {
  group: CanvasGroup;
  onChange: (next: CanvasGroup) => void;
}) => (
  <div className="inspector-form">
    <label>
      Label
      <input value={group.label} onChange={(event) => onChange({ ...group, label: event.target.value })} />
      </label>
    {group.role === "generic" ? (
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={group.enabled !== false}
          onChange={(event) => onChange({ ...group, enabled: event.target.checked })}
        />
        Panel active
      </label>
    ) : null}
    <label>
      Panel role
      <select
        value={group.role}
        onChange={(event) =>
          onChange({
            ...group,
            role: event.target.value as CanvasGroup["role"]
          })
        }
      >
        <option value="generic">Generic</option>
        <option value="rulePanel">Rule Panel</option>
      </select>
    </label>
    <label>
      Color
      <input value={group.color} onChange={(event) => onChange({ ...group, color: event.target.value })} />
    </label>
    <label>
      Width
      <input
        type="number"
        value={group.size.width}
        onChange={(event) => onChange({ ...group, size: { ...group.size, width: Number(event.target.value) } })}
      />
    </label>
    <label>
      Height
      <input
        type="number"
        value={group.size.height}
        onChange={(event) => onChange({ ...group, size: { ...group.size, height: Number(event.target.value) } })}
      />
    </label>
  </div>
);
