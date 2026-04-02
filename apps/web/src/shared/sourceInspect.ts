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
  }
) => {
  const response = await fetch("/api/source/inspect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: subscriptionUrl,
      probeUrl: options?.probeUrl,
      runProbe: options?.runProbe ?? false
    })
  });
  if (!response.ok) {
    throw new Error(`Inspect failed with ${response.status}.`);
  }

  return (await response.json()) as SourceInspectResult;
};
