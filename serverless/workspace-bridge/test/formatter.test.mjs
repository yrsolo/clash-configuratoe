import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import {
  buildLogicalInspectTargets,
  buildLogicalTunnelProxies,
  formatSubscriptionToYaml,
  materializeSubscriptionBackedYaml,
  stableDialerHelperName
} from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "fixtures", "connliberty-tunnel.sample.json");

const readFixture = async () => readFile(fixturePath, "utf-8");

test("formats tunnel bundles into logical proxies with internal helper names", async () => {
  const raw = await readFixture();
  const yamlText = formatSubscriptionToYaml(raw);
  const parsed = YAML.parse(yamlText);

  assert.ok(Array.isArray(parsed.proxies));
  assert.equal(parsed.proxies.length, 3);

  const helper = parsed.proxies.find((entry) => String(entry.name).startsWith("__dialer__"));
  const gb = parsed.proxies.find((entry) => entry.name === "GB bypass");
  const ws = parsed.proxies.find((entry) => entry.name === "WS bypass");

  assert.ok(helper);
  assert.ok(gb);
  assert.ok(ws);
  assert.equal(helper.type, "socks5");
  assert.equal(helper.server, "45.153.161.147");
  assert.equal(helper.username, "vpnliberty0Ft9z");
  assert.equal(helper.password, "RDqd5pojmM");
  assert.equal(gb["dialer-proxy"], helper.name);
  assert.equal(gb["client-fingerprint"], "random");
  assert.deepEqual(gb["reality-opts"], {
    "public-key": "dY9SNEllJMW63xo-JdXufhmjAxB_4uFw_QMjgufjiD8",
    "short-id": "37772edff71b4167"
  });
  assert.equal(ws.network, "ws");
  assert.equal(ws["ws-opts"].path, "/proxy");
  assert.equal(ws["ws-opts"].headers.Host, "cdn.example.com");
  assert.ok(parsed.proxies.every((entry) => !String(entry.name).startsWith("Upstream_")));
  assert.match(yamlText, /public-key: "dY9SNEllJMW63xo-JdXufhmjAxB_4uFw_QMjgufjiD8"/);
  assert.match(yamlText, /short-id: "37772edff71b4167"/);
});

test("builds logical tunnel proxies with optional detour metadata", async () => {
  const raw = await readFixture();
  const configs = JSON.parse(raw);
  const logical = buildLogicalTunnelProxies(configs);

  assert.equal(logical.length, 2);
  assert.equal(logical[0].displayName, "GB bypass");
  assert.equal(logical[0].detourTag, "ru-upstream");
  assert.equal(logical[0].detourOutbound?.protocol, "socks");
  assert.equal(logical[1].displayName, "WS bypass");
  assert.equal(logical[1].detourOutbound, null);
});

test("collapses helper proxies in inspect targets while keeping detour details", async () => {
  const raw = await readFixture();
  const yamlText = formatSubscriptionToYaml(raw);
  const { allProxies, targets } = buildLogicalInspectTargets(yamlText);

  assert.equal(allProxies.length, 3);
  assert.equal(targets.length, 2);

  const gb = targets.find((entry) => entry.proxy.name === "GB bypass");
  const ws = targets.find((entry) => entry.proxy.name === "WS bypass");

  assert.ok(gb);
  assert.ok(ws);
  assert.equal(gb.detourProxy?.server, "45.153.161.147");
  assert.equal(gb.detourProxy?.type, "socks5");
  assert.equal(ws.detourProxy, null);
});

test("passes through already valid Clash proxy YAML unchanged", () => {
  const validYaml = `proxies:\n  - name: direct-1\n    type: socks5\n    server: 127.0.0.1\n    port: 1080\n`;
  assert.equal(formatSubscriptionToYaml(validYaml), validYaml.trim());
});

test("helper names are deterministic and isolated from localized display names", () => {
  const left = stableDialerHelperName("🇬🇧Англия bypass", "uk-gthost-01.com", 443, "ru-upstream");
  const right = stableDialerHelperName("🇬🇧Англия bypass", "uk-gthost-01.com", 443, "ru-upstream");
  const different = stableDialerHelperName("🇬🇧Англия bypass", "uk-gthost-01.com", 443, "other-upstream");

  assert.equal(left, right);
  assert.notEqual(left, different);
  assert.match(left, /^__dialer__[a-f0-9]{12}$/);
});

test("materializes provider-backed yaml into static proxies while keeping helpers out of group members", async () => {
  const baseYaml = YAML.stringify({
    "proxy-providers": {
      lib_auto: {
        type: "http",
        url: "https://example.com/provider",
        path: "./lib_auto.yaml"
      }
    },
    proxies: [
      {
        name: "Personal_HTTP",
        type: "http",
        server: "127.0.0.1",
        port: 8080
      }
    ],
    "proxy-groups": [
      {
        name: "REST_OF_WORLD",
        type: "select",
        use: ["lib_auto"],
        proxies: ["DIRECT", "Personal_HTTP"]
      }
    ],
    rules: ["MATCH,REST_OF_WORLD"]
  });

  const providerYaml = await materializeSubscriptionBackedYaml(baseYaml, async () =>
    YAML.stringify({
      proxies: [
        {
          name: "__dialer__abc123def456",
          type: "socks5",
          server: "10.0.0.1",
          port: 1080
        },
        {
          name: "Italy bypass",
          type: "vless",
          server: "it.example.com",
          port: 443,
          uuid: "11111111-2222-3333-4444-555555555555",
          "dialer-proxy": "__dialer__abc123def456"
        }
      ]
    })
  );

  const parsed = YAML.parse(providerYaml);
  assert.equal(parsed["proxy-providers"], undefined);
  assert.equal(parsed["proxy-groups"][0].use, undefined);
  assert.deepEqual(parsed["proxy-groups"][0].proxies, ["DIRECT", "Personal_HTTP", "Italy bypass"]);
  assert.equal(parsed.proxies.some((entry) => entry.name === "__dialer__abc123def456"), true);
  assert.equal(parsed.proxies.some((entry) => entry.name === "Italy bypass"), true);
});
