import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import {
  buildLogicalInspectTargets,
  fetchFormatterSource,
  buildLogicalTunnelProxies,
  formatSubscriptionToYaml,
  materializeSubscriptionBackedYaml,
  stableDialerHelperName
} from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, "fixtures", "connliberty-tunnel.sample.json");

const readFixture = async () => readFile(fixturePath, "utf-8");

test("native Clash negotiation preserves mixed protocols through publishing", async () => {
  const proxies = [
    { name: "HY2", type: "hysteria2", server: "hy.example.com", port: 443, password: "sample-only" },
    { name: "XHTTP", type: "vless", server: "x.example.com", port: 443,
      uuid: "11111111-2222-3333-4444-555555555555", network: "xhttp", tls: true,
      "xhttp-opts": { path: "/example", mode: "auto", extra: { noGRPCHeader: true } },
      "reality-opts": { "public-key": "sample-key", "short-id": "001122" } }
  ];
  const source = YAML.stringify({ proxies, rules: ["MATCH,DIRECT"], "mixed-port": 9999 });
  const raw = await fetchFormatterSource("https://subscription.example/feed", "clash", async (_url, options) => {
    assert.equal(options.headers["User-Agent"], "clash-verge/v2.4.0");
    return new Response(source);
  });
  const feed = formatSubscriptionToYaml(raw, "clash");
  assert.deepEqual(YAML.parse(feed), { proxies });
  const config = YAML.stringify({
    "proxy-providers": { native: { url: "https://formatter.example/?format=clash" } },
    "proxy-groups": [{ name: "Mine", type: "select", use: ["native"] }],
    rules: ["MATCH,Mine"]
  });
  const published = YAML.parse(await materializeSubscriptionBackedYaml(config, async () => feed));
  assert.deepEqual(published.proxies, proxies.map(proxy => ({ ...proxy, name: `native ${proxy.name}` })));
  assert.deepEqual(published.rules, ["MATCH,Mine"]);
  assert.deepEqual(published["proxy-groups"][0].proxies, ["native HY2", "native XHTTP"]);
});

test("native Clash rejects empty and non-Clash responses", () => {
  for (const raw of ["proxies: []", "<html>Subscribe</html>", "dmxlc3M6Ly9leGFtcGxl", "proxies: [{name: incomplete}]"]) {
    assert.throws(() => formatSubscriptionToYaml(raw, "clash"));
  }
});

test("existing subscriptions keep the legacy request agent", async () => {
  await fetchFormatterSource("https://subscription.example/feed", undefined, async (_url, options) => {
    assert.equal(options.headers["User-Agent"], "v2rayN/6.33");
    return new Response("sample");
  });
});

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
  assert.deepEqual(parsed["proxy-groups"][0].proxies, ["DIRECT", "Personal_HTTP", "lib_auto Italy bypass"]);
  assert.equal(parsed.proxies.some((entry) => entry.name === "lib_auto __dialer__abc123def456"), true);
  assert.equal(parsed.proxies.find((entry) => entry.name === "lib_auto Italy bypass")["dialer-proxy"], "lib_auto __dialer__abc123def456");
});

test("keeps same-named servers and dialers isolated across providers", async () => {
  const source = YAML.stringify({ proxies: [
    { name: "__dialer__shared", type: "socks5", server: "relay.example", port: 1080 },
    { name: "Germany", type: "vless", server: "de.example", port: 443, "dialer-proxy": "__dialer__shared" }
  ] });
  const config = YAML.stringify({
    "proxy-providers": {
      A_filtered: { url: "https://a.example/feed", override: { "additional-prefix": "A " } },
      B: { url: "https://b.example/feed" }
    },
    "proxy-groups": [{ name: "All", use: ["A_filtered", "B"] }]
  });
  const result = YAML.parse(await materializeSubscriptionBackedYaml(config, async () => source));
  assert.equal(result.proxies.length, 4);
  assert.deepEqual(result["proxy-groups"][0].proxies, ["A Germany", "B Germany"]);
  for (const key of ["A", "B"]) {
    assert.equal(result.proxies.find(proxy => proxy.name === `${key} Germany`)["dialer-proxy"], `${key} __dialer__shared`);
  }
});

test("old published filter keys use saved Provider keys without stripping intentional digits", async () => {
  const project = { nodes: [
    { kind: "proxyProvider", providerKey: "lib_" },
    { kind: "proxyProvider", providerKey: "PO_" },
    { kind: "proxyProvider", providerKey: "vpn_123" }
  ] };
  const config = YAML.stringify({
    "proxy-providers": Object.fromEntries(["lib__9177", "PO__9177", "vpn_123"].map(key => [key, { url: "https://source.example/feed" }])),
    "proxy-groups": [{ name: "All", use: ["lib__9177", "PO__9177", "vpn_123"] }]
  });
  const result = YAML.parse(await materializeSubscriptionBackedYaml(config, async () => YAML.stringify({
    proxies: [{ name: "Germany", type: "socks5", server: "test.example", port: 1080 }]
  }), project));
  assert.deepEqual(result["proxy-groups"][0].proxies, ["lib_ Germany", "PO_ Germany", "vpn_123 Germany"]);
});
