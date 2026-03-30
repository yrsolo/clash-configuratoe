import { z } from "zod";

export const positionSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const sizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive()
});

export const healthCheckSchema = z.object({
  enable: z.boolean().default(true),
  interval: z.number().int().positive().default(600),
  url: z.string().min(1).default("http://www.gstatic.com/generate_204")
});

export const sourceFormatterSchema = z.object({
  enabled: z.boolean().default(false)
});

const baseNodeShape = {
  id: z.string(),
  label: z.string(),
  position: positionSchema,
  enabled: z.boolean().default(true),
  comment: z.string().optional(),
  collapsed: z.boolean().optional(),
  color: z.string().optional(),
  canvasGroupId: z.string().optional()
};

export const proxyProviderNodeSchema = z.object({
  ...baseNodeShape,
  kind: z.literal("proxyProvider"),
  providerKey: z.string(),
  sourceType: z.enum(["http"]),
  subscriptionUrl: z.string().url(),
  resolverMode: z.enum(["stub", "serverless"]).default("stub"),
  interval: z.number().int().positive().default(3600),
  path: z.string().default("./provider.yaml"),
  healthCheck: healthCheckSchema.default({
    enable: true,
    interval: 600,
    url: "http://www.gstatic.com/generate_204"
  }),
  formatter: sourceFormatterSchema.default({
    enabled: false
  })
});

export const manualProxyNodeSchema = z.object({
  ...baseNodeShape,
  kind: z.literal("manualProxy"),
  proxy: z.object({
    name: z.string(),
    type: z.enum(["http", "socks5"]),
    server: z.string(),
    port: z.number().int().positive(),
    username: z.string().optional(),
    password: z.string().optional(),
    udp: z.boolean().optional()
  })
});

export const sourceMergeNodeSchema = z.object({
  ...baseNodeShape,
  kind: z.literal("sourceMerge"),
  merge: z.object({
    strategy: z.enum(["combine"]).default("combine"),
    filterEnabled: z.boolean().default(false),
    filterTerms: z.array(z.string()).default([]),
    invert: z.boolean().default(false)
  })
});

export const proxyGroupNodeSchema = z.object({
  ...baseNodeShape,
  kind: z.literal("proxyGroup"),
  group: z.object({
    name: z.string(),
    includeDirect: z.boolean().default(true),
    autoSelect: z.boolean().default(false),
    catchAll: z.boolean().default(false),
    interval: z.number().int().positive().default(300),
    tolerance: z.number().int().positive().default(300)
  })
});

export const ruleSetNodeSchema = z.object({
  ...baseNodeShape,
  kind: z.literal("ruleSet"),
  ruleSet: z.object({
    visibleSections: z
      .array(
        z.enum([
          "domains",
          "domainSuffixes",
          "domainKeywords",
          "geosites",
          "geoips",
          "processNames",
          "ipCidrs",
          "rawRules",
          "match"
        ])
      )
      .default([]),
    name: z.string(),
    first: z.boolean().default(false),
    domains: z.array(z.string()).default([]),
    domainSuffixes: z.array(z.string()).default([]),
    domainKeywords: z.array(z.string()).default([]),
    geosites: z.array(z.string()).default([]),
    geoips: z.array(z.string()).default([]),
    processNames: z.array(z.string()).default([]),
    ipCidrs: z.array(z.string()).default([]),
    rawRules: z.array(z.string()).default([]),
    match: z.boolean().default(false)
  })
});

export const globalSettingsNodeSchema = z.object({
  ...baseNodeShape,
  kind: z.literal("globalSettings"),
  settings: z.object({
    sourceUpdateInterval: z.number().int().positive().default(3600),
    sourceHealthCheckInterval: z.number().int().positive().default(600),
    healthCheckUrl: z.string().default("http://www.gstatic.com/generate_204"),
    formatterUrl: z.string().url().optional()
  })
});

export const configNodeSchema = z.discriminatedUnion("kind", [
  proxyProviderNodeSchema,
  manualProxyNodeSchema,
  sourceMergeNodeSchema,
  proxyGroupNodeSchema,
  ruleSetNodeSchema,
  globalSettingsNodeSchema
]);

export const graphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: z.enum(["group-source", "ruleset-target"])
});

export const canvasGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  enabled: z.boolean().default(true),
  role: z.enum(["generic", "rulePanel"]).default("rulePanel"),
  color: z.string().default("#dbeafe"),
  position: positionSchema,
  size: sizeSchema
});

export const publishArtifactSchema = z.object({
  projectId: z.string(),
  token: z.string(),
  shareUrl: z.string().url(),
  yamlUrl: z.string().url(),
  qrPayload: z.string()
});

export const userSessionSchema = z.object({
  userName: z.string(),
  userKey: z.string(),
  lastProjectId: z.string().optional()
});

export const workspaceProjectMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  updatedAt: z.string(),
  isDefault: z.boolean().default(false),
  source: z.enum(["guest", "workspace", "seed"]).default("workspace")
});

export const userWorkspaceIndexSchema = z.object({
  userName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  activeProjectId: z.string().optional(),
  projects: z.array(workspaceProjectMetaSchema).default([])
});

export const projectSecretsEnvelopeSchema = z.object({
  projects: z.record(
    z.string(),
    z.object({
      global: z
        .object({
          formatterUrl: z.string().url().optional()
        })
        .default({}),
      providers: z.record(
        z.string(),
        z.object({
          subscriptionUrl: z.string().url()
        })
      ).default({}),
      manualProxies: z.record(
        z.string(),
        z.object({
          username: z.string().optional(),
          password: z.string().optional()
        })
      ).default({})
    })
  ).default({})
});

export const configProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  nodes: z.array(configNodeSchema),
  edges: z.array(graphEdgeSchema),
  canvasGroups: z.array(canvasGroupSchema),
  meta: z.object({
    version: z.literal(1),
    createdAt: z.string(),
    updatedAt: z.string()
  })
});

export type Position = z.infer<typeof positionSchema>;
export type Size = z.infer<typeof sizeSchema>;
export type ProxyProviderNode = z.infer<typeof proxyProviderNodeSchema>;
export type ManualProxyNode = z.infer<typeof manualProxyNodeSchema>;
export type SourceMergeNode = z.infer<typeof sourceMergeNodeSchema>;
export type ProxyGroupNode = z.infer<typeof proxyGroupNodeSchema>;
export type RuleSetNode = z.infer<typeof ruleSetNodeSchema>;
export type GlobalSettingsNode = z.infer<typeof globalSettingsNodeSchema>;
export type ConfigNode = z.infer<typeof configNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type CanvasGroup = z.infer<typeof canvasGroupSchema>;
export type PublishArtifact = z.infer<typeof publishArtifactSchema>;
export type UserSession = z.infer<typeof userSessionSchema>;
export type WorkspaceProjectMeta = z.infer<typeof workspaceProjectMetaSchema>;
export type UserWorkspaceIndex = z.infer<typeof userWorkspaceIndexSchema>;
export type ProjectSecretsEnvelope = z.infer<typeof projectSecretsEnvelopeSchema>;
export type ConfigProject = z.infer<typeof configProjectSchema>;

export const isNodeKind = (kind: ConfigNode["kind"], node: ConfigNode): boolean =>
  node.kind === kind;
