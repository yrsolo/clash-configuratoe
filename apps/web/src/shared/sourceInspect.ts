export type SourceInspectProxy = {
  name: string;
  type: string;
  server: string;
  port: number;
  detourServer: string | null;
  detourPort: number | null;
  detourType: string | null;
  pingMs: number | null;
  status: string;
};

export type SourceInspectResult = {
  sourceUrl: string;
  probeUrl?: string;
  total: number;
  proxies: SourceInspectProxy[];
};

export const inspectSource = async (
  subscriptionUrl: string,
  options?: {
    probeUrl?: string;
    runProbe?: boolean;
    sourceFormat?: "legacy" | "clash";
    providerKey?: string;
  }
) => {
  const response = await fetch("/api/source/inspect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: subscriptionUrl,
      format: options?.sourceFormat,
      probeUrl: options?.probeUrl,
      runProbe: options?.runProbe ?? false
    })
  });
  if (!response.ok) {
    throw new Error(`Inspect failed with ${response.status}.`);
  }

  const result = (await response.json()) as SourceInspectResult;
  if (options?.providerKey !== undefined) {
    result.proxies = result.proxies.map((proxy) => ({ ...proxy, name: `${options.providerKey} ${proxy.name}` }));
  }
  return result;
};

export const inspectVlessUri = (vlessUrl: string): SourceInspectResult => {
  const url = new URL(vlessUrl);
  if (url.protocol !== "vless:" || !url.hostname || !url.username) {
    throw new Error("VLESS URI must include a UUID and server address.");
  }

  return {
    sourceUrl: "direct-vless-uri",
    total: 1,
    proxies: [
      {
        name: url.hash ? decodeURIComponent(url.hash.slice(1)) : `${url.hostname}:${url.port || "443"}`,
        type: "vless",
        server: url.hostname,
        port: Number(url.port || 443),
        detourServer: null,
        detourPort: null,
        detourType: null,
        pingMs: null,
        status: "ready"
      }
    ]
  };
};
