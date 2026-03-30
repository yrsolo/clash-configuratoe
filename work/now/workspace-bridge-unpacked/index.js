import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import net from "node:net";
import { fetch as proxyFetch, ProxyAgent } from "undici";
import YAML from "yaml";

const bucket = process.env.WORKSPACE_BUCKET;
const endpoint = process.env.S3_ENDPOINT ?? "https://storage.yandexcloud.net";
const formatterProxyUrl = String(process.env.PROXY_URL ?? "").trim().replace(/^['"]+|['"]+$/g, "");
const formatterProxyAgent = formatterProxyUrl ? new ProxyAgent(formatterProxyUrl) : null;

const client = new S3Client({
  region: "ru-central1",
  endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

const readStream = async (body) => {
  if (!body) return "";
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
};

const json = (statusCode, payload) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(payload)
});

const fail = (statusCode, message) => json(statusCode, { error: message });

const parseBody = (event) => {
  if (!event.body) {
    return {};
  }

  return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body);
};

const getKeyPrefix = (userKey) => `users/${userKey}`;
const indexKey = (userKey) => `${getKeyPrefix(userKey)}/index.json`;
const secretsKey = (userKey) => `${getKeyPrefix(userKey)}/secrets.json`;
const projectKey = (userKey, projectId) => `${getKeyPrefix(userKey)}/projects/${projectId}.project.json`;
const yamlKey = (userKey, projectId) => `${getKeyPrefix(userKey)}/projects/${projectId}.yaml`;
const publishedKey = (id) => `published/${id}.json`;

const loadJson = async (key, fallback = null) => {
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
    const raw = await readStream(response.Body);
    return JSON.parse(raw);
  } catch (error) {
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      return fallback;
    }
    throw error;
  }
};

const saveJson = async (key, payload) =>
  client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(payload, null, 2),
      ContentType: "application/json"
    })
  );

const saveText = async (key, payload, contentType) =>
  client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: payload,
      ContentType: contentType
    })
  );

const plainText = (statusCode, payload, contentType = "text/plain; charset=utf-8") => ({
  statusCode,
  headers: {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  },
  body: payload
});

const decodeBase64Utf8 = (value) => Buffer.from(value.trim(), "base64").toString("utf-8");

const normalizeFetchedText = (value) => value.replace(/^\uFEFF/, "").replace(/&quot;/g, "\"").trim();

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const looksLikeProxyEntry = (value) =>
  isObject(value) && typeof value.name === "string" && typeof value.type === "string";

const isYamlProxyList = (value) => {
  try {
    const parsed = YAML.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.length > 0 && parsed.every(looksLikeProxyEntry);
    }

    if (isObject(parsed) && Array.isArray(parsed.proxies)) {
      return parsed.proxies.every(looksLikeProxyEntry);
    }

    return false;
  } catch {
    return false;
  }
};

const extractProxyList = (value) => {
  const parsed = YAML.parse(value);
  if (Array.isArray(parsed) && parsed.every(looksLikeProxyEntry)) {
    return parsed;
  }

  if (isObject(parsed) && Array.isArray(parsed.proxies) && parsed.proxies.every(looksLikeProxyEntry)) {
    return parsed.proxies;
  }

  return [];
};

const getUrlString = (url) => {
  const normalized = String(url ?? "").trim();
  if (!normalized) {
    throw new Error("Missing ?url=");
  }

  const parsed = new URL(normalized);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Formatter only supports http/https URLs.");
  }

  return parsed.toString();
};

const parseVlessToYaml = (link) => {
  try {
    const [main, namePart] = link.split("#");
    const name = namePart ? decodeURIComponent(namePart).trim() : `Proxy_${Math.floor(Math.random() * 1000)}`;
    const withoutProto = main.replace("vless://", "");
    const [uuid, rest] = withoutProto.split("@");
    const [serverPort, queryString] = rest.split("?");
    const [server, port] = serverPort.split(":");
    const params = new URLSearchParams(queryString ?? "");

    const lines = [
      `  - name: ${YAML.stringify(name).trim()}`,
      "    type: vless",
      `    server: ${server}`,
      `    port: ${port}`,
      `    uuid: ${uuid}`,
      `    network: ${params.get("type") || "tcp"}`,
      "    udp: true"
    ];

    if (params.get("security") === "reality") {
      lines.push("    tls: true");
      if (params.get("sni")) lines.push(`    servername: ${params.get("sni")}`);
      if (params.get("fp")) lines.push(`    client-fingerprint: ${params.get("fp")}`);
      if (params.get("flow")) lines.push(`    flow: ${params.get("flow")}`);
      lines.push("    reality-opts:");
      lines.push(`      public-key: ${params.get("pbk")}`);
      if (params.get("sid")) lines.push(`      short-id: ${params.get("sid")}`);
    }

    return `${lines.join("\n")}\n`;
  } catch {
    return "";
  }
};

const extractTunnelYaml = (text) => {
  const jsonStart = text.indexOf("[");
  const jsonEnd = text.lastIndexOf("]");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return null;
  }

  const configs = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  let yamlOutput = "proxies:\n";

  for (const config of configs) {
    const outbounds = Array.isArray(config?.outbounds) ? config.outbounds : [];
    const vless = outbounds.find((entry) => entry?.protocol === "vless");
    const socks = outbounds.find((entry) => entry?.protocol === "socks" && entry?.tag === "ru-upstream");
    const name = String(config?.remarks ?? "").trim() || `Tunnel_${Math.floor(Math.random() * 100)}`;

    let dialerName = "";
    if (socks) {
      const server = socks?.settings?.servers?.[0];
      if (server?.address && server?.port) {
        dialerName = `Upstream_${name}`;
        yamlOutput += `  - name: ${YAML.stringify(dialerName).trim()}\n`;
        yamlOutput += "    type: socks5\n";
        yamlOutput += `    server: ${server.address}\n`;
        yamlOutput += `    port: ${server.port}\n`;
        if (Array.isArray(server.users) && server.users[0]?.user) {
          yamlOutput += `    username: ${YAML.stringify(String(server.users[0].user)).trim()}\n`;
          yamlOutput += `    password: ${YAML.stringify(String(server.users[0].pass ?? "")).trim()}\n`;
        }
      }
    }

    if (vless) {
      const target = vless?.settings?.vnext?.[0];
      const user = target?.users?.[0];
      const stream = vless?.streamSettings ?? {};
      const reality = stream?.realitySettings ?? {};
      if (!target?.address || !target?.port || !user?.id) {
        continue;
      }

      yamlOutput += `  - name: ${YAML.stringify(name).trim()}\n`;
      yamlOutput += "    type: vless\n";
      yamlOutput += `    server: ${target.address}\n`;
      yamlOutput += `    port: ${target.port}\n`;
      yamlOutput += `    uuid: ${user.id}\n`;
      yamlOutput += `    network: ${stream.network || "tcp"}\n`;
      yamlOutput += "    udp: true\n";
      yamlOutput += "    tls: true\n";
      if (reality.serverName) yamlOutput += `    servername: ${reality.serverName}\n`;
      if (reality.publicKey) {
        yamlOutput += "    reality-opts:\n";
        yamlOutput += `      public-key: ${reality.publicKey}\n`;
        if (reality.shortId) yamlOutput += `      short-id: ${reality.shortId}\n`;
      }
      if (dialerName) yamlOutput += `    dialer-proxy: ${YAML.stringify(dialerName).trim()}\n`;
    }
  }

  return yamlOutput;
};

const extractVlessYaml = (rawText) => {
  let text = rawText;
  if (!text.includes("vless://")) {
    try {
      text = decodeBase64Utf8(text);
    } catch {
      // Keep original text and continue with direct regex match.
    }
  }

  const matches = text.match(/vless:\/\/[^\s"'<>]+/g) ?? [];
  let yamlOutput = "proxies:\n";
  for (const link of matches) {
    yamlOutput += parseVlessToYaml(link.replace(/&amp;/g, "&"));
  }
  return yamlOutput;
};

const formatSubscriptionToYaml = (rawText) => {
  const cleanText = normalizeFetchedText(rawText);

  if (isYamlProxyList(cleanText)) {
    return cleanText;
  }

  if (cleanText.startsWith("[") || cleanText.includes("\"outbounds\"")) {
    try {
      const tunnelYaml = extractTunnelYaml(cleanText);
      if (tunnelYaml) {
        return tunnelYaml;
      }
    } catch {
      // Fall through to vless extraction mode.
    }
  }

  return extractVlessYaml(cleanText);
};

const measureTcpLatency = (server, port) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (payload) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(payload);
    };

    socket.setTimeout(4000);
    socket.once("connect", () =>
      finish({
        pingMs: Date.now() - startedAt,
        status: "ok"
      })
    );
    socket.once("timeout", () =>
      finish({
        pingMs: null,
        status: "timeout"
      })
    );
    socket.once("error", (error) =>
      finish({
        pingMs: null,
        status: error?.code || "error"
      })
    );

    socket.connect(Number(port), String(server));
  });

const inspectProxyYaml = async (yamlText) => {
  const proxies = extractProxyList(yamlText).slice(0, 200);
  const inspected = [];

  for (const proxy of proxies) {
    const latency = await measureTcpLatency(proxy.server, proxy.port);
    inspected.push({
      name: proxy.name,
      type: proxy.type,
      server: proxy.server,
      port: Number(proxy.port),
      pingMs: latency.pingMs,
      status: latency.status
    });
  }

  inspected.sort((left, right) => {
    if (left.pingMs == null && right.pingMs == null) return left.name.localeCompare(right.name);
    if (left.pingMs == null) return 1;
    if (right.pingMs == null) return -1;
    return left.pingMs - right.pingMs;
  });

  return inspected;
};

const fetchFormatterSource = async (targetUrl) => {
  const response = await proxyFetch(targetUrl, {
    dispatcher: formatterProxyAgent ?? undefined,
    headers: {
      "User-Agent": "v2rayN/6.33",
      Accept: "*/*"
    }
  });

  if (!response.ok) {
    throw new Error(`Formatter upstream responded with ${response.status}.`);
  }

  const buffer = await response.arrayBuffer();
  return new TextDecoder("utf-8").decode(buffer);
};

const handleFormatterRequest = async (query) => {
  const targetUrl = getUrlString(query.url);
  const rawText = await fetchFormatterSource(targetUrl);

  if ("debug" in query) {
    return plainText(200, rawText);
  }

  const yamlText = formatSubscriptionToYaml(rawText);

  if ("inspect" in query) {
    const proxies = await inspectProxyYaml(yamlText);
    return json(200, {
      sourceUrl: targetUrl,
      total: proxies.length,
      proxies
    });
  }

  return plainText(200, yamlText, "application/x-yaml; charset=utf-8");
};

const removeObject = async (key) =>
  client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );

const ensureIndex = async (userName, userKey) => {
  const existing = await loadJson(indexKey(userKey));
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const created = {
    userName,
    createdAt: now,
    updatedAt: now,
    activeProjectId: undefined,
    projects: []
  };
  await saveJson(indexKey(userKey), created);
  return created;
};

const sha256Hex = (value) => createHash("sha256").update(value).digest("hex");

const buildStablePublishedIdentity = (userKey, projectId) => ({
  id: `cfg-${sha256Hex(`published-id:${userKey}:${projectId}`).slice(0, 32)}`,
  token: sha256Hex(`published-token:${userKey}:${projectId}`).slice(0, 48)
});

const ensureSecrets = async (userKey) => {
  const existing = await loadJson(secretsKey(userKey));
  if (existing) {
    return existing;
  }

  const created = { projects: {} };
  await saveJson(secretsKey(userKey), created);
  return created;
};

const buildProjectMeta = (project) => ({
  id: project.id,
  name: project.name,
  description: project.description ?? "",
  updatedAt: project.meta?.updatedAt ?? new Date().toISOString(),
  isDefault: false,
  source: "workspace"
});

const getProjectBundle = async (userKey, projectId) => {
  const project = await loadJson(projectKey(userKey, projectId));
  if (!project) {
    return { project: null, secrets: null };
  }

  const secrets = await ensureSecrets(userKey);
  return {
    project,
    secrets: {
      projects: {
        [projectId]: secrets.projects?.[projectId] ?? {
          global: {},
          providers: {},
          manualProxies: {}
        }
      }
    }
  };
};

export const handler = async (event) => {
  try {
    const path = event.rawPath ?? event.path;
    const method = event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
    const query = event.queryStringParameters ?? {};
    const body = method === "POST" ? parseBody(event) : {};
    const routePath = String(path ?? "");
    const matchesRoute = (route) => routePath.includes(route);

    if (method === "GET" && matchesRoute("/api/formatter/inspect")) {
      return await handleFormatterRequest({
        ...query,
        inspect: "1"
      });
    }

    if (method === "GET" && matchesRoute("/api/formatter")) {
      return await handleFormatterRequest(query);
    }

    if (method === "GET" && matchesRoute("/api/published/yaml")) {
      const id = String(query.id ?? "").trim();
      const token = String(query.token ?? "").trim();
      if (!id || !token) {
        return fail(400, "Missing published id or token.");
      }

      const record = await loadJson(publishedKey(id));
      if (!record || record.token !== token) {
        return fail(404, "Published YAML not found.");
      }

      return plainText(200, record.yaml, "application/x-yaml; charset=utf-8");
    }

    if (method === "GET" && matchesRoute("/api/published/project")) {
      const id = String(query.id ?? "").trim();
      const token = String(query.token ?? "").trim();
      if (!id || !token) {
        return fail(400, "Missing published id or token.");
      }

      const record = await loadJson(publishedKey(id));
      if (!record || record.token !== token) {
        return fail(404, "Published project not found.");
      }

      return json(200, { project: record.project ?? null });
    }

    if (method === "POST" && matchesRoute("/api/published/save")) {
      const id = String(body.id ?? "").trim();
      const token = String(body.token ?? "").trim();
      const yaml = String(body.yaml ?? "");
      const project = body.project ?? null;
      const existing = id ? await loadJson(publishedKey(id), null) : null;
      const createdAt = String(body.createdAt ?? existing?.createdAt ?? new Date().toISOString());
      const updatedAt = new Date().toISOString();

      if (!id || !token || !yaml || !project) {
        return fail(400, "Missing published payload.");
      }

      await saveJson(publishedKey(id), {
        id,
        token,
        project,
        yaml,
        createdAt,
        updatedAt
      });

      return json(200, { ok: true, id });
    }

    if (method !== "POST") {
      return fail(405, "Method not allowed.");
    }

    const userName = String(body.userName ?? "").trim();
    const userKey = String(body.userKey ?? "").trim();

    if (!userName || !userKey) {
      return fail(400, "Missing user identity.");
    }

    if (matchesRoute("/session/restore")) {
      const index = await ensureIndex(userName, userKey);
      let activeProject = null;
      let secrets = null;

      if (index.activeProjectId) {
        const bundle = await getProjectBundle(userKey, index.activeProjectId);
        activeProject = bundle.project;
        secrets = bundle.secrets;
      }

      return json(200, {
        session: {
          userName,
          userKey,
          lastProjectId: index.activeProjectId
        },
        index,
        activeProject,
        secrets
      });
    }

    if (matchesRoute("/projects/load")) {
      const projectId = String(body.projectId ?? "").trim();
      if (!projectId) {
        return fail(400, "Missing projectId.");
      }

      const bundle = await getProjectBundle(userKey, projectId);
      if (!bundle.project) {
        return fail(404, "Project not found.");
      }

      return json(200, bundle);
    }

    if (matchesRoute("/projects/save")) {
      const project = body.project;
      const publishedProject = body.publishedProject ?? project;
      const yaml = String(body.yaml ?? "");
      const secretsPayload = body.secrets ?? { projects: {} };
      const setActive = Boolean(body.setActive);

      if (!project?.id || !publishedProject?.id || !yaml) {
        return fail(400, "Missing project payload.");
      }

      const index = await ensureIndex(userName, userKey);
      const secrets = await ensureSecrets(userKey);
      const now = new Date().toISOString();

      project.meta = {
        ...project.meta,
        updatedAt: now
      };

      await saveJson(projectKey(userKey, project.id), project);
      await saveText(yamlKey(userKey, project.id), yaml, "application/x-yaml");

      secrets.projects = {
        ...secrets.projects,
        [project.id]: secretsPayload.projects?.[project.id] ?? {
          global: {},
          providers: {},
          manualProxies: {}
        }
      };
      await saveJson(secretsKey(userKey), secrets);

      const publishedIdentity = buildStablePublishedIdentity(userKey, project.id);
      const existingPublished = await loadJson(publishedKey(publishedIdentity.id), null);
      await saveJson(publishedKey(publishedIdentity.id), {
        id: publishedIdentity.id,
        token: publishedIdentity.token,
        project: publishedProject,
        yaml,
        projectId: project.id,
        userKey,
        createdAt: existingPublished?.createdAt ?? now,
        updatedAt: now
      });

      const existingIndex = index.projects.findIndex((entry) => entry.id === project.id);
      const meta = buildProjectMeta(project);
      if (existingIndex === -1) {
        index.projects.push(meta);
      } else {
        index.projects[existingIndex] = meta;
      }

      index.updatedAt = now;
      if (setActive || !index.activeProjectId) {
        index.activeProjectId = project.id;
      }

      await saveJson(indexKey(userKey), index);
      return json(200, { index });
    }

    if (matchesRoute("/projects/delete")) {
      const projectId = String(body.projectId ?? "").trim();
      if (!projectId) {
        return fail(400, "Missing projectId.");
      }

      const index = await ensureIndex(userName, userKey);
      const secrets = await ensureSecrets(userKey);
      const publishedIdentity = buildStablePublishedIdentity(userKey, projectId);

      await removeObject(projectKey(userKey, projectId));
      await removeObject(yamlKey(userKey, projectId));
      await removeObject(publishedKey(publishedIdentity.id));

      index.projects = index.projects.filter((entry) => entry.id !== projectId);
      if (index.activeProjectId === projectId) {
        index.activeProjectId = index.projects[0]?.id;
      }
      index.updatedAt = new Date().toISOString();

      if (secrets.projects?.[projectId]) {
        delete secrets.projects[projectId];
      }

      await saveJson(indexKey(userKey), index);
      await saveJson(secretsKey(userKey), secrets);

      return json(200, { index, deletedProjectId: projectId });
    }

    return fail(404, "Unknown route.");
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Unexpected error.");
  }
};
