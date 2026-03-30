export type SourceInspectProxy = {
  name: string;
  type: string;
  server: string;
  port: number;
  pingMs: number | null;
  status: string;
};

export type SourceInspectResult = {
  sourceUrl: string;
  probeUrl?: string;
  total: number;
  proxies: SourceInspectProxy[];
};

export const inspectSource = async (subscriptionUrl: string, probeUrl?: string) => {
  const response = await fetch("/api/source/inspect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: subscriptionUrl,
      probeUrl
    })
  });
  if (!response.ok) {
    throw new Error(`Inspect failed with ${response.status}.`);
  }

  return (await response.json()) as SourceInspectResult;
};
