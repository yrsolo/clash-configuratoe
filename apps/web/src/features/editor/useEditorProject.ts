import {
  builtInPresets,
  canConnectNodes,
  configProjectSchema,
  getDefaultFormatterUrl,
  createCanvasGroup,
  importClashYaml,
  renderClashYaml,
  validateProject,
  type ConfigNode,
  type ConfigProject,
  type GraphEdge,
  type PublishArtifact,
  type UserSession,
  type UserWorkspaceIndex
} from "@clash-configuratoe/schema";
import { useEffect, useMemo, useRef, useState } from "react";

import defaultNewProject from "../../../../../default/new.json";

import { createNode } from "./defaults";
import {
  buildWorkspacePublishArtifact,
  publishProject,
  refreshPublishedYaml
} from "@/shared/publish";
import { clearDraft, loadDraft, saveDraft } from "@/shared/storage";
import {
  buildUserKey,
  clearWorkspaceSession,
  loadWorkspaceSession,
  normalizeUserName,
  saveWorkspaceSession
} from "@/shared/workspaceAuth";
import {
  deleteWorkspaceProject,
  loadWorkspaceProject,
  restoreWorkspaceSession,
  saveWorkspaceProject
} from "@/shared/workspaceApi";
import { extractProjectSecrets, mergeProjectSecrets } from "@/shared/workspaceSecrets";

type WorkspaceStatus = "guest" | "loading" | "ready" | "error";
type ProjectSetter = ConfigProject | ((current: ConfigProject) => ConfigProject);
type ProjectCommitOptions = {
  recordHistory?: boolean;
  resetHistory?: boolean;
};
const PROJECT_HISTORY_LIMIT = 100;

const createDefaultProject = (): ConfigProject => {
  const template = structuredClone(defaultNewProject) as ConfigProject;
  const now = new Date().toISOString();

  return configProjectSchema.parse({
    ...template,
    id: crypto.randomUUID(),
    nodes: template.nodes.map(node => node.kind === "globalSettings"
      ? { ...node, settings: { ...node.settings, formatterUrl: getDefaultFormatterUrl() } }
      : node),
    meta: {
      ...template.meta,
      version: template.meta?.version ?? 1,
      createdAt: now,
      updatedAt: now
    }
  });
};

const withUpdatedTimestamp = (project: ConfigProject) => ({
  ...project,
  meta: {
    ...project.meta,
    updatedAt: new Date().toISOString()
  }
});

const guestProject = () => {
  const draft = loadDraft();
  if (draft) {
    return configProjectSchema.parse(draft);
  }

  return createDefaultProject();
};

const createWorkspacePersistenceSnapshot = (project: ConfigProject) => {
  const { sanitizedProject, secrets } = extractProjectSecrets(project, project.id);

  return JSON.stringify({
    project: sanitizedProject,
    publishedProject: project,
    secrets,
    yaml: renderClashYaml(project)
  });
};

export const useEditorProject = (initialProject?: ConfigProject | null) => {
  const [project, setProjectState] = useState<ConfigProject>(() => {
    if (initialProject) {
      return configProjectSchema.parse(initialProject);
    }

    return guestProject();
  });
  const projectRef = useRef(project);
  const [pastProjects, setPastProjects] = useState<ConfigProject[]>([]);
  const [futureProjects, setFutureProjects] = useState<ConfigProject[]>([]);
  const [yamlImport, setYamlImport] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [publishArtifact, setPublishArtifact] = useState<PublishArtifact | null>(null);
  const [workspaceSession, setWorkspaceSession] = useState<UserSession | null>(() => loadWorkspaceSession());
  const [workspaceIndex, setWorkspaceIndex] = useState<UserWorkspaceIndex | null>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>(
    initialProject ? "guest" : loadWorkspaceSession() ? "loading" : "guest"
  );
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [authDraft, setAuthDraft] = useState({
    userName: loadWorkspaceSession()?.userName ?? "",
    code: ""
  });
  const hydrationRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const lastPersistedSnapshotRef = useRef<string | null>(null);
  const validationIssues = useMemo(() => validateProject(project), [project]);
  const [yamlPreview, setYamlPreview] = useState(
    "# Published YAML preview appears here after you refresh the stable publish link.\n"
  );
  const [yamlPreviewStatus, setYamlPreviewStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const commitProject = (nextProject: ProjectSetter, options: ProjectCommitOptions = {}) => {
    const currentProject = projectRef.current;
    const resolvedProject =
      typeof nextProject === "function"
        ? (nextProject as (current: ConfigProject) => ConfigProject)(currentProject)
        : nextProject;

    if (resolvedProject === currentProject) {
      return currentProject;
    }

    const parsedProject = configProjectSchema.parse(resolvedProject);

    if (options.resetHistory) {
      setPastProjects([]);
      setFutureProjects([]);
    } else if (options.recordHistory !== false) {
      setPastProjects((current) => [
        ...current.slice(-(PROJECT_HISTORY_LIMIT - 1)),
        currentProject
      ]);
      setFutureProjects([]);
    }

    projectRef.current = parsedProject;
    setProjectState(parsedProject);
    return parsedProject;
  };

  const setProject = (nextProject: ProjectSetter) => commitProject(nextProject);

  const loadProjectWithoutHistory = (nextProject: ConfigProject) =>
    commitProject(nextProject, { recordHistory: false, resetHistory: true });

  const persistWorkspaceProject = async (
    targetProject: ConfigProject,
    session = workspaceSession,
    options?: { setActive?: boolean }
  ) => {
    if (!session) {
      return null;
    }

    const { sanitizedProject, secrets } = extractProjectSecrets(targetProject, targetProject.id);
    const persistenceSnapshot = JSON.stringify({
      project: sanitizedProject,
      publishedProject: targetProject,
      secrets,
      yaml: renderClashYaml(targetProject)
    });
    const nextIndex = await saveWorkspaceProject(
      {
        ...session,
        lastProjectId: targetProject.id
      },
      sanitizedProject,
      targetProject,
      secrets,
      options
    );

    lastPersistedSnapshotRef.current = persistenceSnapshot;
    setWorkspaceIndex(nextIndex);
    const nextLastProjectId = nextIndex.activeProjectId ?? targetProject.id;

    if (session.lastProjectId !== nextLastProjectId) {
      const nextSession = {
        ...session,
        lastProjectId: nextLastProjectId
      };
      setWorkspaceSession(nextSession);
      saveWorkspaceSession(nextSession);
    }

    return nextIndex;
  };

  const loadWorkspaceProjectIntoEditor = async (session: UserSession, projectId: string) => {
    hydrationRef.current = true;
    const loaded = await loadWorkspaceProject(session, projectId);
    const mergedProject = mergeProjectSecrets(loaded.project, loaded.secrets, projectId);
    lastPersistedSnapshotRef.current = createWorkspacePersistenceSnapshot(mergedProject);
    loadProjectWithoutHistory(mergedProject);
    const nextSession = { ...session, lastProjectId: projectId };
    setWorkspaceSession(nextSession);
    saveWorkspaceSession(nextSession);
    hydrationRef.current = false;
    return mergedProject;
  };

  const restoreSessionState = async (session: UserSession) => {
    setWorkspaceStatus("loading");
    setWorkspaceError(null);

    try {
      const restored = await restoreWorkspaceSession(session);
      let nextIndex = restored.index;
      let activeProject = restored.activeProject
        ? mergeProjectSecrets(restored.activeProject, restored.secrets, restored.activeProject.id)
        : null;

      if (nextIndex.projects.length === 0 && normalizeUserName(session.userName).toLowerCase() === "yrsolo-dev") {
        const seeded = createDefaultProject();
        nextIndex = (await persistWorkspaceProject(
          seeded,
          { ...session, lastProjectId: seeded.id },
          { setActive: true }
        )) ?? nextIndex;
        activeProject = seeded;
      }

      if (!activeProject && nextIndex.activeProjectId) {
        activeProject = await loadWorkspaceProjectIntoEditor(
          { ...session, lastProjectId: nextIndex.activeProjectId },
          nextIndex.activeProjectId
        );
      }

      setWorkspaceIndex(nextIndex);
      setWorkspaceSession({
        ...session,
        lastProjectId: nextIndex.activeProjectId ?? session.lastProjectId
      });
      saveWorkspaceSession({
        ...session,
        lastProjectId: nextIndex.activeProjectId ?? session.lastProjectId
      });

      if (activeProject) {
        lastPersistedSnapshotRef.current = createWorkspacePersistenceSnapshot(activeProject);
        loadProjectWithoutHistory(activeProject);
      } else {
        lastPersistedSnapshotRef.current = null;
        loadProjectWithoutHistory(createDefaultProject());
      }

      setWorkspaceStatus("ready");
    } catch (error) {
      setWorkspaceStatus("error");
      setWorkspaceError(error instanceof Error ? error.message : "Failed to restore workspace.");
      clearWorkspaceSession();
      setWorkspaceSession(null);
      setWorkspaceIndex(null);
    }
  };

  useEffect(() => {
    if (initialProject) {
      return;
    }

    if (workspaceSession) {
      void restoreSessionState(workspaceSession);
    }
  }, []);

  useEffect(() => {
    if (initialProject) {
      return;
    }

    if (workspaceSession) {
      return;
    }

    saveDraft(project);
  }, [initialProject, project, workspaceSession]);

  useEffect(() => {
    if (!workspaceSession || workspaceStatus !== "ready" || hydrationRef.current) {
      return;
    }

    if (!workspaceIndex?.activeProjectId || workspaceIndex.activeProjectId !== project.id) {
      return;
    }

    const currentSnapshot = createWorkspacePersistenceSnapshot(project);
    if (lastPersistedSnapshotRef.current === currentSnapshot) {
      return;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      void persistWorkspaceProject(withUpdatedTimestamp(project));
    }, 700);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [project, workspaceIndex?.activeProjectId, workspaceSession, workspaceStatus]);

  useEffect(() => {
    let active = true;

    const syncWorkspaceArtifact = async () => {
      if (!workspaceSession || workspaceStatus !== "ready" || workspaceIndex?.activeProjectId !== project.id) {
        return;
      }

      const artifact = await buildWorkspacePublishArtifact(project, workspaceSession);
      if (active) {
        setPublishArtifact(artifact);
      }
    };

    void syncWorkspaceArtifact();

    return () => {
      active = false;
    };
  }, [project.id, workspaceIndex?.activeProjectId, workspaceSession, workspaceStatus]);

  const signIn = async () => {
    const userName = normalizeUserName(authDraft.userName);
    const code = authDraft.code.trim();
    if (!userName || !code) {
      setWorkspaceError("Enter both user name and access code.");
      return;
    }

    const session: UserSession = {
      userName,
      userKey: await buildUserKey(userName, code),
      lastProjectId: workspaceSession?.lastProjectId
    };

    setWorkspaceSession(session);
    await restoreSessionState(session);
  };

  const signOut = () => {
    clearWorkspaceSession();
    clearDraft();
    lastPersistedSnapshotRef.current = null;
    setWorkspaceSession(null);
    setWorkspaceIndex(null);
    setWorkspaceStatus("guest");
    setWorkspaceError(null);
    setAuthDraft((current) => ({ ...current, code: "" }));
    loadProjectWithoutHistory(createDefaultProject());
  };

  const selectWorkspaceProject = async (projectId: string) => {
    if (!workspaceSession) {
      return;
    }

    const loadedProject = await loadWorkspaceProjectIntoEditor(workspaceSession, projectId);
    const nextIndex = workspaceIndex
      ? { ...workspaceIndex, activeProjectId: projectId, updatedAt: new Date().toISOString() }
      : workspaceIndex;

    if (nextIndex) {
      setWorkspaceIndex(nextIndex);
    }

    await persistWorkspaceProject(withUpdatedTimestamp(loadedProject), workspaceSession, { setActive: true });
  };

  const createWorkspaceProject = async () => {
    if (!workspaceSession) {
      return;
    }

    const nextProject = {
      ...createDefaultProject(),
      id: crypto.randomUUID(),
      name: `Config ${new Date().toLocaleString()}`,
      description: "New workspace project."
    };

    hydrationRef.current = true;
    loadProjectWithoutHistory(nextProject);
    hydrationRef.current = false;
    await persistWorkspaceProject(nextProject, workspaceSession, { setActive: true });
  };

  const duplicateWorkspaceProject = async (projectId: string) => {
    if (!workspaceSession) {
      return;
    }

    let sourceProject = project;
    if (project.id !== projectId) {
      const loaded = await loadWorkspaceProject(workspaceSession, projectId);
      sourceProject = mergeProjectSecrets(loaded.project, loaded.secrets, projectId);
    }

    const duplicated = {
      ...structuredClone(sourceProject),
      id: crypto.randomUUID(),
      name: `${sourceProject.name} Copy`,
      meta: {
        ...sourceProject.meta,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    hydrationRef.current = true;
    loadProjectWithoutHistory(duplicated);
    hydrationRef.current = false;
    await persistWorkspaceProject(duplicated, workspaceSession, { setActive: true });
  };

  const deleteWorkspaceCurrentProject = async (projectId: string) => {
    if (!workspaceSession) {
      return;
    }

    const result = await deleteWorkspaceProject(workspaceSession, projectId);
    setWorkspaceIndex(result.index);

    if (result.index.activeProjectId) {
      await loadWorkspaceProjectIntoEditor(workspaceSession, result.index.activeProjectId);
      return;
    }

    hydrationRef.current = true;
    loadProjectWithoutHistory(createDefaultProject());
    hydrationRef.current = false;
  };

  const addNode = (kind: ConfigNode["kind"]) => {
    setProject((current) => ({
      ...current,
      nodes: [...current.nodes, createNode(kind, current.nodes.length)],
      meta: {
        ...current.meta,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const addNodeAt = (
    kind: ConfigNode["kind"],
    position: { x: number; y: number },
    canvasGroupId?: string
  ) => {
    setProject((current) => {
      const node = createNode(kind, current.nodes.length);
      node.position = position;
      node.canvasGroupId = canvasGroupId;

      return {
        ...current,
        nodes: [...current.nodes, node],
        meta: {
          ...current.meta,
          updatedAt: new Date().toISOString()
        }
      };
    });
  };

  const addCanvasGroupAt = (
    role: "generic" | "rulePanel",
    position: { x: number; y: number }
  ) => {
    setProject((current) => ({
      ...current,
      canvasGroups: [
        ...current.canvasGroups,
        createCanvasGroup({
          role,
          label: role === "rulePanel" ? `Rule Panel ${current.canvasGroups.length + 1}` : `Panel ${current.canvasGroups.length + 1}`,
          position,
          size: role === "rulePanel" ? { width: 260, height: 170 } : { width: 360, height: 260 }
        })
      ],
      meta: {
        ...current.meta,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const updateNode = (nodeId: string, updater: (node: ConfigNode) => ConfigNode) => {
    setProject((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
      meta: {
        ...current.meta,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const updateCanvasGroup = (
    groupId: string,
    updater: (group: ConfigProject["canvasGroups"][number]) => ConfigProject["canvasGroups"][number]
  ) => {
    setProject((current) => ({
      ...current,
      canvasGroups: current.canvasGroups.map((group) => (group.id === groupId ? updater(group) : group)),
      meta: {
        ...current.meta,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const importYaml = () => {
    if (!yamlImport.trim()) {
      return;
    }
    try {
      const input = yamlImport.trim();
      const parsed = input.startsWith("{")
        ? configProjectSchema.parse(JSON.parse(input))
        : importClashYaml(input);
      const now = new Date().toISOString();
      const imported: ConfigProject = {
        ...parsed,
        // Imports create a new project rather than silently overwriting an old publication.
        id: crypto.randomUUID(),
        nodes: parsed.nodes.map(node => node.kind === "globalSettings"
          ? { ...node, settings: { ...node.settings, formatterUrl: node.settings.formatterUrl ?? getDefaultFormatterUrl() } }
          : node),
        meta: { ...parsed.meta, createdAt: now, updatedAt: now }
      };
      setProject(imported);
      setImportError(null);
      if (!workspaceSession) clearDraft();
    } catch {
      setImportError("Не удалось импортировать конфигурацию. Вставьте полный JSON проекта или корректный Clash YAML.");
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = builtInPresets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    const targetGroup = project.nodes.find(
      (node) =>
        node.kind === "proxyGroup" &&
        (node.group.name.toLowerCase().includes(preset.label.toLowerCase()) ||
          node.label.toLowerCase().includes(preset.label.toLowerCase().replace(/\s+/g, "_")))
    );

    const newRuleSet = createNode("ruleSet", project.nodes.length);
    if (newRuleSet.kind !== "ruleSet") {
      return;
    }

    newRuleSet.label = preset.label;
    newRuleSet.ruleSet.name = preset.label;
    newRuleSet.ruleSet = {
      ...preset.ruleSet
    };

    setProject((current) => ({
      ...current,
      nodes: [...current.nodes, newRuleSet],
      edges: targetGroup
        ? [
            ...current.edges,
            {
              id: crypto.randomUUID(),
              source: newRuleSet.id,
              target: targetGroup.id,
              kind: "ruleset-target"
            }
          ]
        : current.edges,
      meta: {
        ...current.meta,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const connectNodes = (sourceId: string, targetId: string) => {
    const source = project.nodes.find((node) => node.id === sourceId);
    const target = project.nodes.find((node) => node.id === targetId);
    const sourcePanel = project.canvasGroups.find((group) => group.id === sourceId);

    if ((!source && !sourcePanel) || !target) {
      return;
    }

    const kind =
      sourcePanel?.role === "rulePanel" && target.kind === "proxyGroup"
        ? "ruleset-target"
        : source
          ? canConnectNodes(source, target)
          : null;
    if (!kind) {
      return;
    }

    const edge: GraphEdge = {
      id: crypto.randomUUID(),
      source: sourceId,
      target: targetId,
      kind
    };

    setProject((current) => ({
      ...current,
      edges: [
        ...current.edges.filter(
          (item) => !(item.source === edge.source && item.target === edge.target && item.kind === edge.kind)
        ),
        edge
      ],
      meta: {
        ...current.meta,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const duplicateNode = (nodeId: string) => {
    setProject((current) => {
      const node = current.nodes.find((entry) => entry.id === nodeId);
      if (!node) return current;

      const duplicated: ConfigNode = {
        ...structuredClone(node),
        id: crypto.randomUUID(),
        label: `${node.label} Copy`,
        position: { x: node.position.x + 28, y: node.position.y + 28 }
      };

      if (duplicated.kind === "proxyGroup") {
        duplicated.group = {
          ...duplicated.group,
          name: `${duplicated.group.name} Copy`,
          catchAll: false
        };
      }

      if (duplicated.kind === "manualProxy") {
        duplicated.proxy = {
          ...duplicated.proxy,
          name: `${duplicated.proxy.name}_copy`
        };
      }

      if (duplicated.kind === "proxyProvider") {
        duplicated.providerKey = `${duplicated.providerKey}_copy`;
      }

      if (duplicated.kind === "ruleSet") {
        duplicated.ruleSet = {
          ...duplicated.ruleSet,
          name: `${duplicated.ruleSet.name} Copy`
        };
      }

      return {
        ...current,
        nodes: [...current.nodes, duplicated],
        meta: {
          ...current.meta,
          updatedAt: new Date().toISOString()
        }
      };
    });
  };

  const duplicateCanvasGroup = (groupId: string) => {
    setProject((current) => {
      const group = current.canvasGroups.find((entry) => entry.id === groupId);
      if (!group) return current;

      const nextGroupId = crypto.randomUUID();
      const groupCopy = {
        ...structuredClone(group),
        id: nextGroupId,
        label: `${group.label} Copy`,
        position: { x: group.position.x + 40, y: group.position.y + 40 }
      };

      const childCopies = current.nodes
        .filter((node) => node.canvasGroupId === groupId)
        .map((node) => ({
          ...structuredClone(node),
          id: crypto.randomUUID(),
          canvasGroupId: nextGroupId,
          position: { x: node.position.x + 40, y: node.position.y + 40 }
        }));

      return {
        ...current,
        canvasGroups: [...current.canvasGroups, groupCopy],
        nodes: [...current.nodes, ...childCopies],
        meta: {
          ...current.meta,
          updatedAt: new Date().toISOString()
        }
      };
    });
  };

  const publish = async () => {
    setYamlPreviewStatus("loading");
    const artifact = await publishProject(project, workspaceSession);
    setPublishArtifact(artifact);
    try {
      const publishedYaml = await refreshPublishedYaml(artifact.projectId, artifact.token);
      setYamlPreview(publishedYaml);
      setYamlPreviewStatus("idle");
    } catch {
      setYamlPreviewStatus("error");
    }
  };

  const resetToDemo = () => {
    const next = createDefaultProject();
    setProject(next);
    setPublishArtifact(null);
    if (!workspaceSession) {
      clearDraft();
    }
  };

  const undo = () => {
    const previousProject = pastProjects.at(-1);
    if (!previousProject) {
      return;
    }

    const currentProject = projectRef.current;
    setPastProjects((current) => current.slice(0, -1));
    setFutureProjects((current) => [currentProject, ...current].slice(0, PROJECT_HISTORY_LIMIT));
    projectRef.current = previousProject;
    setProjectState(previousProject);
  };

  const redo = () => {
    const nextProject = futureProjects[0];
    if (!nextProject) {
      return;
    }

    const currentProject = projectRef.current;
    setFutureProjects((current) => current.slice(1));
    setPastProjects((current) => [...current.slice(-(PROJECT_HISTORY_LIMIT - 1)), currentProject]);
    projectRef.current = nextProject;
    setProjectState(nextProject);
  };

  return {
    project,
    setProject,
    updateNode,
    updateCanvasGroup,
    addNode,
    addNodeAt,
    addCanvasGroupAt,
    yamlPreview,
    yamlPreviewStatus,
    validationIssues,
    yamlImport,
    importError,
    setYamlImport,
    importYaml,
    publish,
    publishArtifact,
    resetToDemo,
    undo,
    redo,
    canUndo: pastProjects.length > 0,
    canRedo: futureProjects.length > 0,
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
  };
};
