import { afterEach, expect, it, vi } from "vitest";
import { inspectSource } from "../src/shared/sourceInspect";

afterEach(() => vi.restoreAllMocks());

it("passes the native subscription format to inspection and manual probes", async () => {
  const fetchMock = vi.spyOn(window, "fetch").mockImplementation(async () => new Response(JSON.stringify({ total: 0, proxies: [] })));
  for (const runProbe of [false, true]) {
    await inspectSource("https://subscription.example/feed", { sourceFormat: "clash", runProbe });
    const init = fetchMock.mock.calls.at(-1)?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({ format: "clash", runProbe });
  }
});

it("prefixes server names in inspection results", async () => {
  vi.spyOn(window, "fetch").mockImplementation(async () => new Response(JSON.stringify({
    total: 1, proxies: [{ name: "Germany", type: "vless", server: "de.example", port: 443 }]
  })));
  const result = await inspectSource("https://subscription.example/feed", { providerKey: "MyProvider" });
  expect(result.proxies[0].name).toBe("MyProvider Germany");
});
