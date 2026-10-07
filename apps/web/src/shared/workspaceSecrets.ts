import { getDefaultFormatterUrl } from "@clash-configuratoe/schema";
import type { ConfigProject, ProjectSecretsEnvelope } from "@clash-configuratoe/schema";

const redactedSubscriptionUrl = "https://workspace.invalid/subscription";

const normalizeFormatterUrl = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  if (
    normalized.includes("formatter.invalid") ||
    normalized.includes("clash.solofarm.ru") ||
    normalized.includes("vless-extractor.") ||
    normalized.includes("workers.dev")
  ) {
    return getDefaultFormatterUrl();
  }

  return normalized;
};

export const extractProjectSecrets = (
  project: ConfigProject,
  projectId = project.id
): { sanitizedProject: ConfigProject; secrets: ProjectSecretsEnvelope } => {
  const sanitizedProject: ConfigProject = structuredClone(project);
  const secrets: ProjectSecretsEnvelope = {
    projects: {
      [projectId]: {
      global: {},
      providers: {},
      manualProxies: {},
      vlessProxies: {}
      }
    }
  };

  const targetSecrets = secrets.projects[projectId];

  for (const node of sanitizedProject.nodes) {
    if (node.kind === "globalSettings" && node.settings.formatterUrl) {
      targetSecrets.global.formatterUrl = node.settings.formatterUrl;
      delete node.settings.formatterUrl;
    }

    if (node.kind === "proxyProvider") {
      targetSecrets.providers[node.id] = {
        subscriptionUrl: node.subscriptionUrl
      };
      node.subscriptionUrl = redactedSubscriptionUrl;
    }

    if (node.kind === "manualProxy" && (node.proxy.username || node.proxy.password)) {
      targetSecrets.manualProxies[node.id] = {
        username: node.proxy.username,
        password: node.proxy.password
      };
      delete node.proxy.username;
      delete node.proxy.password;
    }

    if (node.kind === "vlessProxy") {
      targetSecrets.vlessProxies[node.id] = { vlessUrl: node.vlessUrl };
      node.vlessUrl = "vless://00000000-0000-0000-0000-000000000000@workspace.invalid:443?type=tcp#Redacted";
    }
  }

  return { sanitizedProject, secrets };
};

export const mergeProjectSecrets = (
  project: ConfigProject,
  envelope: ProjectSecretsEnvelope | null,
  projectId = project.id
) => {
  if (!envelope) {
    return project;
  }

  const targetSecrets = envelope.projects[projectId];
  if (!targetSecrets) {
    return project;
  }

  const merged = structuredClone(project);

  for (const node of merged.nodes) {
    if (node.kind === "globalSettings") {
      node.settings.formatterUrl =
        normalizeFormatterUrl(targetSecrets.global.formatterUrl) ?? node.settings.formatterUrl;
    }

    if (node.kind === "proxyProvider" && targetSecrets.providers[node.id]?.subscriptionUrl) {
      node.subscriptionUrl = targetSecrets.providers[node.id].subscriptionUrl;
    }

    if (node.kind === "manualProxy") {
      const proxySecrets = targetSecrets.manualProxies[node.id];
      if (proxySecrets) {
        node.proxy.username = proxySecrets.username;
        node.proxy.password = proxySecrets.password;
      }
    }

    if (node.kind === "vlessProxy" && targetSecrets.vlessProxies[node.id]?.vlessUrl) {
      node.vlessUrl = targetSecrets.vlessProxies[node.id].vlessUrl;
    }
  }

  return merged;
};
