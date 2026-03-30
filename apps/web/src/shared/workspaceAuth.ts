import type { UserSession } from "@clash-configuratoe/schema";

const sessionStorageKey = "clash-configuratoe:workspace-session:v1";
const appSalt = import.meta.env.VITE_WORKSPACE_APP_SALT ?? "clash-workspace-v1";

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

export const normalizeUserName = (value: string) => value.trim();

export const buildUserKey = async (userName: string, code: string) => {
  const normalizedName = normalizeUserName(userName).toLowerCase();
  const payload = `${normalizedName}:${code.trim()}:${appSalt}`;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  return toHex(digest);
};

export const saveWorkspaceSession = (session: UserSession) => {
  localStorage.setItem(sessionStorageKey, JSON.stringify(session));
};

export const loadWorkspaceSession = (): UserSession | null => {
  try {
    const raw = localStorage.getItem(sessionStorageKey);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  } catch {
    localStorage.removeItem(sessionStorageKey);
    return null;
  }
};

export const clearWorkspaceSession = () => {
  localStorage.removeItem(sessionStorageKey);
};
