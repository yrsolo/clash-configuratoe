import {
  configProjectSchema,
  projectSecretsEnvelopeSchema,
  renderClashYaml,
  userSessionSchema,
  userWorkspaceIndexSchema,
  type ConfigProject,
  type ProjectSecretsEnvelope,
  type UserSession,
  type UserWorkspaceIndex
} from "@clash-configuratoe/schema";

const apiBase = import.meta.env.VITE_WORKSPACE_API_BASE ?? "/api/workspace";

type RestoreResponse = {
  session: UserSession;
  index: UserWorkspaceIndex;
  activeProject: ConfigProject | null;
  secrets: ProjectSecretsEnvelope | null;
};

const postJson = async <T>(path: string, payload: Record<string, unknown>) => {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Workspace API failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

export const restoreWorkspaceSession = async (session: UserSession): Promise<RestoreResponse> => {
  const raw = await postJson<RestoreResponse>("/session/restore", session);
  return {
    session: userSessionSchema.parse(raw.session),
    index: userWorkspaceIndexSchema.parse(raw.index),
    activeProject: raw.activeProject ? configProjectSchema.parse(raw.activeProject) : null,
    secrets: raw.secrets ? projectSecretsEnvelopeSchema.parse(raw.secrets) : null
  };
};

export const loadWorkspaceProject = async (session: UserSession, projectId: string) => {
  const raw = await postJson<{ project: ConfigProject; secrets: ProjectSecretsEnvelope | null }>(
    "/projects/load",
    {
      ...session,
      projectId
    }
  );

  return {
    project: configProjectSchema.parse(raw.project),
    secrets: raw.secrets ? projectSecretsEnvelopeSchema.parse(raw.secrets) : null
  };
};

export const saveWorkspaceProject = async (
  session: UserSession,
  project: ConfigProject,
  publishedProject: ConfigProject,
  secrets: ProjectSecretsEnvelope,
  options?: { setActive?: boolean }
) => {
  const raw = await postJson<{ index: UserWorkspaceIndex }>("/projects/save", {
      ...session,
      project,
      publishedProject,
      secrets,
      yaml: renderClashYaml(publishedProject),
      setActive: options?.setActive ?? false
    });

  return userWorkspaceIndexSchema.parse(raw.index);
};

export const deleteWorkspaceProject = async (session: UserSession, projectId: string) => {
  const raw = await postJson<{ index: UserWorkspaceIndex; deletedProjectId: string }>(
    "/projects/delete",
    {
      ...session,
      projectId
    }
  );

  return {
    index: userWorkspaceIndexSchema.parse(raw.index),
    deletedProjectId: raw.deletedProjectId
  };
};
