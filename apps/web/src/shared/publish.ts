import QRCode from "qrcode";
import type { ConfigProject, PublishArtifact, UserSession } from "@clash-configuratoe/schema";
import { renderClashYaml } from "@clash-configuratoe/schema";

const appUrl = import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin;
const publishApiBase = import.meta.env.VITE_WORKSPACE_API_BASE ?? "/api/workspace";
const publishRoot = publishApiBase.replace("/workspace", "");

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(digest);
};

export const buildStablePublishedIdentity = async (session: UserSession, projectId: string) => {
  const idHash = await sha256Hex(`published-id:${session.userKey}:${projectId}`);
  const tokenHash = await sha256Hex(`published-token:${session.userKey}:${projectId}`);

  return {
    id: `cfg-${idHash.slice(0, 32)}`,
    token: tokenHash.slice(0, 48)
  };
};

const buildPublishUrls = (id: string, token: string) => ({
  shareUrl: `${appUrl}/?published=${id}&token=${token}`,
  yamlUrl: `${appUrl}${publishRoot}/published/yaml?id=${id}&token=${token}`
});

export const buildWorkspacePublishArtifact = async (
  project: ConfigProject,
  session: UserSession
): Promise<PublishArtifact> => {
  const { id, token } = await buildStablePublishedIdentity(session, project.id);
  const { shareUrl, yamlUrl } = buildPublishUrls(id, token);
  const qrPayload = await QRCode.toDataURL(yamlUrl, {
    margin: 1,
    width: 220
  });

  return {
    projectId: id,
    token,
    shareUrl,
    yamlUrl,
    qrPayload
  };
};

export const publishProject = async (
  project: ConfigProject,
  session?: UserSession | null
): Promise<PublishArtifact> => {
  const identity = session
    ? await buildStablePublishedIdentity(session, project.id)
    : {
        id: crypto.randomUUID(),
        token: crypto.randomUUID().replaceAll("-", "")
      };
  const { id, token } = identity;
  const yaml = renderClashYaml(project);
  const { shareUrl, yamlUrl } = buildPublishUrls(id, token);
  const qrPayload = await QRCode.toDataURL(yamlUrl, {
    margin: 1,
    width: 220
  });

  const response = await fetch(`${publishRoot}/published/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id,
      token,
      project: {
        ...project,
        id,
        meta: {
          ...project.meta,
          updatedAt: new Date().toISOString()
        }
      },
      yaml,
      createdAt: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to publish project.");
  }

  return {
    projectId: id,
    token,
    shareUrl,
    yamlUrl,
    qrPayload
  };
};

export const refreshPublishedYaml = async (id: string, token: string): Promise<string> => {
  const response = await fetch(`${publishRoot}/published/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id,
      token
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to refresh published YAML.");
  }

  return response.text();
};

export const loadPublishedProject = async (id: string, token: string): Promise<ConfigProject | null> => {
  const response = await fetch(`${publishRoot}/published/project?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`);
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { project?: ConfigProject | null };
  return payload.project ?? null;
};

export const loadPublishedYaml = async (id: string, token: string): Promise<string | null> => {
  const response = await fetch(`${publishRoot}/published/yaml?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`);
  if (!response.ok) {
    return null;
  }
  return response.text();
};
