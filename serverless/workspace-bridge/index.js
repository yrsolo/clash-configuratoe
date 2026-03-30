import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { fetch as proxyFetch, ProxyAgent } from "undici";
import YAML from "yaml";

const bucket = process.env.WORKSPACE_BUCKET;
const endpoint = process.env.S3_ENDPOINT ?? "https://storage.yandexcloud.net";
const formatterProxyUrl = String(process.env.PROXY_URL ?? "").trim().replace(/^['"]+|['"]+$/g, "");
const formatterProxyAgent = formatterProxyUrl ? new ProxyAgent(formatterProxyUrl) : null;
const __dirname = dirname(fileURLToPath(import.meta.url));
const bundledSingBoxPath = join(__dirname, "bin", "sing-box");
const runtimeSingBoxPath = join(tmpdir(), "clash-configuratoe", "sing-box");
const probeTimeoutMs = 8000;

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const getPortNumber = (value) => {
  const port = Number(value);
  return Number.isFinite(port) ? port : undefined;
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

const measureTcpLatency = (server, port, timeoutMs = 4000) =>
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

    socket.setTimeout(timeoutMs);
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

const getGlobalProbeUrl = (url) => {
  const target = String(url ?? "").trim();
  return target || "http://www.gstatic.com/generate_204";
};

const ensureRuntimeSingBox = () => {
  if (!existsSync(runtimeSingBoxPath)) {
    mkdirSync(dirname(runtimeSingBoxPath), { recursive: true });
    copyFileSync(bundledSingBoxPath, runtimeSingBoxPath);
  }

  chmodSync(runtimeSingBoxPath, 0o755);
  return runtimeSingBoxPath;
};

const getFreePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });

const waitForPort = async (port, timeoutMs = 5000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await measureTcpLatency("127.0.0.1", port, 400);
    if (result.status === "ok") {
      return;
    }
    await sleep(120);
  }
  throw new Error(`Proxy runtime did not open local port ${port}.`);
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

const toSingBoxOutbound = (proxy, allByName, tag) => {
  const basePort = getPortNumber(proxy.port);
  if (!proxy.server || !basePort) {
    throw new Error(`Proxy ${proxy.name ?? tag} is missing server or port.`);
  }

  if (proxy.type === "socks5") {
    const outbound = {
      type: "socks",
      tag,
      server: String(proxy.server),
      server_port: basePort
    };
    if (proxy.username) outbound.username = String(proxy.username);
    if (proxy.password) outbound.password = String(proxy.password);
    return outbound;
  }

  if (proxy.type === "vless") {
    const outbound = {
      type: "vless",
      tag,
      server: String(proxy.server),
      server_port: basePort,
      uuid: String(proxy.uuid),
      packet_encoding: "xudp"
    };

    if (proxy.flow) {
      outbound.flow = String(proxy.flow);
    }

    if (proxy["dialer-proxy"]) {
      const detourProxy = allByName.get(String(proxy["dialer-proxy"]));
      if (detourProxy) {
        outbound.detour = `${tag}-detour`;
      }
    }

    const tls = {};
    if (proxy.tls || proxy.servername || proxy["reality-opts"]) {
      tls.enabled = true;
      tls.server_name = String(proxy.servername ?? proxy.server);
      if (proxy["client-fingerprint"]) {
        tls.utls = {
          enabled: true,
          fingerprint: String(proxy["client-fingerprint"])
        };
      }
      if (proxy["reality-opts"]?.["public-key"]) {
        tls.reality = {
          enabled: true,
          public_key: String(proxy["reality-opts"]["public-key"]),
          short_id: String(proxy["reality-opts"]["short-id"] ?? "")
        };
      }
    }
    if (Object.keys(tls).length > 0) {
      outbound.tls = tls;
    }

    const network = String(proxy.network ?? "tcp");
    if (network === "ws") {
      outbound.transport = {
        type: "ws",
        path: String(proxy["ws-opts"]?.path ?? "/")
      };
      const headers = proxy["ws-opts"]?.headers;
      if (headers && typeof headers === "object") {
        outbound.transport.headers = headers;
      }
    } else if (network === "grpc") {
      outbound.transport = {
        type: "grpc",
        service_name: String(proxy["grpc-opts"]?.["grpc-service-name"] ?? "")
      };
    }

    return outbound;
  }

  throw new Error(`Unsupported proxy type: ${proxy.type}`);
};

const buildProbeConfig = (proxy, allProxies, inboundPort) => {
  const allByName = new Map(allProxies.map((entry) => [String(entry.name), entry]));
  const outbounds = [];
  const mainOutbound = toSingBoxOutbound(proxy, allByName, "probe-target");

  if (proxy["dialer-proxy"]) {
    const detourProxy = allByName.get(String(proxy["dialer-proxy"]));
    if (detourProxy) {
      outbounds.push(toSingBoxOutbound(detourProxy, allByName, "probe-target-detour"));
    }
  }

  outbounds.push(mainOutbound);
  outbounds.push({ type: "direct", tag: "direct" });

  return {
    log: {
      level: "error",
      timestamp: false
    },
    inbounds: [
      {
        type: "mixed",
        tag: "probe-in",
        listen: "127.0.0.1",
        listen_port: inboundPort
      }
    ],
    outbounds,
    route: {
      final: "probe-target"
    }
  };
};

const probeProxyThroughSingBox = async (proxy, allProxies, probeUrl) => {
  const inboundPort = await getFreePort();
  const configPath = join(tmpdir(), `clash-configuratoe-probe-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const binaryPath = ensureRuntimeSingBox();
  const config = buildProbeConfig(proxy, allProxies, inboundPort);
  const fs = await import("node:fs/promises");
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");

  const child = spawn(binaryPath, ["run", "-c", configPath], {
    stdio: ["ignore", "ignore", "pipe"]
  });
  let timeout;

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf-8");
  });

  try {
    await waitForPort(inboundPort, 5000);
    const startedAt = Date.now();
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), probeTimeoutMs);
    const response = await proxyFetch(probeUrl, {
      dispatcher: new ProxyAgent(`http://127.0.0.1:${inboundPort}`),
      method: "GET",
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-cache"
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Probe target responded with ${response.status}.`);
    }

    await response.arrayBuffer();
    return {
      pingMs: Date.now() - startedAt,
      status: "ok"
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    child.kill("SIGTERM");
    await fs.rm(configPath, { force: true });
  }
};

const mapConcurrency = async (items, concurrency, worker) => {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
};

const inspectProxyYaml = async (yamlText, probeUrl) => {
  const proxies = extractProxyList(yamlText).slice(0, 60);
  const inspected = await mapConcurrency(proxies, 3, async (proxy) => {
    try {
      const latency = await probeProxyThroughSingBox(proxy, proxies, probeUrl);
      return {
        name: proxy.name,
        type: proxy.type,
        server: proxy.server,
        port: Number(proxy.port),
        pingMs: latency.pingMs,
        status: latency.status
      };
    } catch (error) {
      return {
        name: proxy.name,
        type: proxy.type,
        server: proxy.server,
        port: Number(proxy.port),
        pingMs: null,
        status: error instanceof Error ? error.message : "probe-error"
      };
    }
  });

  inspected.sort((left, right) => {
    if (left.pingMs == null && right.pingMs == null) return left.name.localeCompare(right.name);
    if (left.pingMs == null) return 1;
    if (right.pingMs == null) return -1;
    return left.pingMs - right.pingMs;
  });

  return inspected;
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

    if (method === "POST" && matchesRoute("/source/inspect")) {
      const targetUrl = getUrlString(body.url);
      const rawText = await fetchFormatterSource(targetUrl);
      const yamlText = formatSubscriptionToYaml(rawText);
      const proxies = await inspectProxyYaml(yamlText, getGlobalProbeUrl(body.probeUrl));
      return json(200, {
        sourceUrl: targetUrl,
        probeUrl: getGlobalProbeUrl(body.probeUrl),
        total: proxies.length,
        proxies
      });
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
