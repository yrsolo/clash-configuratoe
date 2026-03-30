import type { ConfigProject } from "@clash-configuratoe/schema";

const draftKey = "clash-configuratoe:draft:v5";
const publishPrefix = "clash-configuratoe:publish:";
const draftVersion = 5;

type DraftEnvelope = {
  version: number;
  project: ConfigProject;
};

const isUsableProject = (value: unknown): value is ConfigProject => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ConfigProject>;
  return Array.isArray(candidate.nodes) && Array.isArray(candidate.edges) && candidate.nodes.length > 0;
};

export type StoredPublishRecord = {
  id: string;
  token: string;
  project: ConfigProject;
  yaml: string;
  createdAt: string;
};

export const saveDraft = (project: ConfigProject) => {
  const payload: DraftEnvelope = {
    version: draftVersion,
    project
  };
  localStorage.setItem(draftKey, JSON.stringify(payload));
};

export const loadDraft = (): ConfigProject | null => {
  try {
    const raw = localStorage.getItem(draftKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as DraftEnvelope | ConfigProject;

    if ("version" in (parsed as DraftEnvelope) && "project" in (parsed as DraftEnvelope)) {
      const envelope = parsed as DraftEnvelope;
      if (envelope.version !== draftVersion || !isUsableProject(envelope.project)) {
        localStorage.removeItem(draftKey);
        return null;
      }
      return envelope.project;
    }

    localStorage.removeItem(draftKey);
    return null;
  } catch {
    localStorage.removeItem(draftKey);
    return null;
  }
};

export const clearDraft = () => {
  localStorage.removeItem(draftKey);
};

export const savePublishedRecord = (record: StoredPublishRecord) => {
  localStorage.setItem(`${publishPrefix}${record.id}`, JSON.stringify(record));
};

export const loadPublishedRecord = (id: string): StoredPublishRecord | null => {
  const raw = localStorage.getItem(`${publishPrefix}${id}`);
  return raw ? (JSON.parse(raw) as StoredPublishRecord) : null;
};
