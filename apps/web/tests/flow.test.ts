import { describe, expect, it } from "vitest";

import type { ConfigProject } from "@clash-configuratoe/schema";

import {
  applyNodePositions,
  moveGenericPanelChildrenInFlow,
  projectToFlowNodes
} from "../src/features/editor/flow";

describe("applyNodePositions", () => {
  it("moves nodes inside a generic panel together with the panel", () => {
    const project: ConfigProject = {
      id: "project-1",
      name: "Test",
      description: "",
      nodes: [
        {
          id: "provider-1",
          kind: "proxyProvider",
          label: "Source A",
          position: { x: 120, y: 140 },
          enabled: true,
          canvasGroupId: "panel-1",
          providerKey: "source_a",
          sourceType: "http",
          subscriptionUrl: "https://example.com/sub.yaml",
          resolverMode: "stub",
          interval: 3600,
          path: "./source_a.yaml",
          healthCheck: {
            enable: true,
            interval: 600,
            url: "http://www.gstatic.com/generate_204"
          },
          formatter: {
            enabled: false
          }
        }
      ],
      edges: [],
      canvasGroups: [
        {
          id: "panel-1",
          label: "Visual Panel",
          enabled: true,
          role: "generic",
          color: "#dbeafe",
          position: { x: 80, y: 100 },
          size: { width: 360, height: 260 }
        }
      ],
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const movedNodes = projectToFlowNodes(project).map((node) =>
      node.id === "panel-1"
        ? {
            ...node,
            position: { x: 160, y: 180 }
          }
        : node
    );

    const next = applyNodePositions(project, movedNodes);
    const provider = next.nodes.find((node) => node.id === "provider-1");

    expect(provider?.position).toEqual({ x: 200, y: 220 });
  });

  it("assigns a node to a generic panel when the node center moves inside the panel", () => {
    const project: ConfigProject = {
      id: "project-2",
      name: "Test",
      description: "",
      nodes: [
        {
          id: "provider-1",
          kind: "proxyProvider",
          label: "Source A",
          position: { x: 20, y: 20 },
          enabled: true,
          providerKey: "source_a",
          sourceType: "http",
          subscriptionUrl: "https://example.com/sub.yaml",
          resolverMode: "stub",
          interval: 3600,
          path: "./source_a.yaml",
          healthCheck: {
            enable: true,
            interval: 600,
            url: "http://www.gstatic.com/generate_204"
          },
          formatter: {
            enabled: false
          }
        }
      ],
      edges: [],
      canvasGroups: [
        {
          id: "panel-1",
          label: "Visual Panel",
          enabled: true,
          role: "generic",
          color: "#dbeafe",
          position: { x: 80, y: 100 },
          size: { width: 360, height: 260 }
        }
      ],
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const movedNodes = projectToFlowNodes(project).map((node) =>
      node.id === "provider-1"
        ? {
            ...node,
            position: { x: 140, y: 160 }
          }
        : node
    );

    const next = applyNodePositions(project, movedNodes);
    const provider = next.nodes.find((node) => node.id === "provider-1");

    expect(provider?.canvasGroupId).toBe("panel-1");
  });

  it("removes a node from a generic panel when the node center leaves the panel rect", () => {
    const project: ConfigProject = {
      id: "project-3",
      name: "Test",
      description: "",
      nodes: [
        {
          id: "provider-1",
          kind: "proxyProvider",
          label: "Source A",
          position: { x: 120, y: 140 },
          enabled: true,
          canvasGroupId: "panel-1",
          providerKey: "source_a",
          sourceType: "http",
          subscriptionUrl: "https://example.com/sub.yaml",
          resolverMode: "stub",
          interval: 3600,
          path: "./source_a.yaml",
          healthCheck: {
            enable: true,
            interval: 600,
            url: "http://www.gstatic.com/generate_204"
          },
          formatter: {
            enabled: false
          }
        }
      ],
      edges: [],
      canvasGroups: [
        {
          id: "panel-1",
          label: "Visual Panel",
          enabled: true,
          role: "generic",
          color: "#dbeafe",
          position: { x: 80, y: 100 },
          size: { width: 360, height: 260 }
        }
      ],
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const movedNodes = projectToFlowNodes(project).map((node) =>
      node.id === "provider-1"
        ? {
            ...node,
            position: { x: 520, y: 480 }
          }
        : node
    );

    const next = applyNodePositions(project, movedNodes);
    const provider = next.nodes.find((node) => node.id === "provider-1");

    expect(provider?.canvasGroupId).toBeUndefined();
  });

  it("updates generic panel size from flow node dimensions", () => {
    const project: ConfigProject = {
      id: "project-4",
      name: "Test",
      description: "",
      nodes: [],
      edges: [],
      canvasGroups: [
        {
          id: "panel-1",
          label: "Visual Panel",
          enabled: true,
          role: "generic",
          color: "#dbeafe",
          position: { x: 80, y: 100 },
          size: { width: 360, height: 260 }
        }
      ],
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const movedNodes = projectToFlowNodes(project).map((node) =>
      node.id === "panel-1"
        ? {
            ...node,
            width: 520,
            height: 340
          }
        : node
    );

    const next = applyNodePositions(project, movedNodes);
    expect(next.canvasGroups[0]?.size).toEqual({ width: 520, height: 340 });
  });

  it("updates generic panel size from measured flow node dimensions", () => {
    const project: ConfigProject = {
      id: "project-4b",
      name: "Test",
      description: "",
      nodes: [],
      edges: [],
      canvasGroups: [
        {
          id: "panel-1",
          label: "Visual Panel",
          enabled: true,
          role: "generic",
          color: "#dbeafe",
          position: { x: 80, y: 100 },
          size: { width: 360, height: 260 }
        }
      ],
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const movedNodes = projectToFlowNodes(project).map((node) =>
      node.id === "panel-1"
        ? {
            ...node,
            width: undefined,
            height: undefined,
            measured: { width: 520, height: 340 }
          }
        : node
    );

    const next = applyNodePositions(project, movedNodes);
    expect(next.canvasGroups[0]?.size).toEqual({ width: 520, height: 340 });
  });

  it("does not drag child nodes with an inactive generic panel", () => {
    const project: ConfigProject = {
      id: "project-5",
      name: "Test",
      description: "",
      nodes: [
        {
          id: "provider-1",
          kind: "proxyProvider",
          label: "Source A",
          position: { x: 120, y: 140 },
          enabled: true,
          canvasGroupId: "panel-1",
          providerKey: "source_a",
          sourceType: "http",
          subscriptionUrl: "https://example.com/sub.yaml",
          resolverMode: "stub",
          interval: 3600,
          path: "./source_a.yaml",
          healthCheck: {
            enable: true,
            interval: 600,
            url: "http://www.gstatic.com/generate_204"
          },
          formatter: {
            enabled: false
          }
        }
      ],
      edges: [],
      canvasGroups: [
        {
          id: "panel-1",
          label: "Visual Panel",
          enabled: false,
          role: "generic",
          color: "#dbeafe",
          position: { x: 80, y: 100 },
          size: { width: 360, height: 260 }
        }
      ],
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const movedNodes = projectToFlowNodes(project).map((node) =>
      node.id === "panel-1"
        ? {
            ...node,
            position: { x: 160, y: 180 }
          }
        : node
    );

    const next = applyNodePositions(project, movedNodes);
    const provider = next.nodes.find((node) => node.id === "provider-1");

    expect(provider?.position).toEqual({ x: 120, y: 140 });
    expect(provider?.canvasGroupId).toBe("panel-1");
  });

  it("moves child flow nodes immediately with an active generic panel drag delta", () => {
    const project: ConfigProject = {
      id: "project-6",
      name: "Test",
      description: "",
      nodes: [
        {
          id: "provider-1",
          kind: "proxyProvider",
          label: "Source A",
          position: { x: 120, y: 140 },
          enabled: true,
          canvasGroupId: "panel-1",
          providerKey: "source_a",
          sourceType: "http",
          subscriptionUrl: "https://example.com/sub.yaml",
          resolverMode: "stub",
          interval: 3600,
          path: "./source_a.yaml",
          healthCheck: {
            enable: true,
            interval: 600,
            url: "http://www.gstatic.com/generate_204"
          },
          formatter: {
            enabled: false
          }
        }
      ],
      edges: [],
      canvasGroups: [
        {
          id: "panel-1",
          label: "Visual Panel",
          enabled: true,
          role: "generic",
          color: "#dbeafe",
          position: { x: 80, y: 100 },
          size: { width: 360, height: 260 }
        }
      ],
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const nextFlowNodes = moveGenericPanelChildrenInFlow(
      projectToFlowNodes(project),
      project,
      "panel-1",
      { dx: 80, dy: 60 }
    );

    const provider = nextFlowNodes.find((node) => node.id === "provider-1");
    expect(provider?.position).toEqual({ x: 200, y: 200 });
  });

  it("does not move child flow nodes with an inactive generic panel drag delta", () => {
    const project: ConfigProject = {
      id: "project-7",
      name: "Test",
      description: "",
      nodes: [
        {
          id: "provider-1",
          kind: "proxyProvider",
          label: "Source A",
          position: { x: 120, y: 140 },
          enabled: true,
          canvasGroupId: "panel-1",
          providerKey: "source_a",
          sourceType: "http",
          subscriptionUrl: "https://example.com/sub.yaml",
          resolverMode: "stub",
          interval: 3600,
          path: "./source_a.yaml",
          healthCheck: {
            enable: true,
            interval: 600,
            url: "http://www.gstatic.com/generate_204"
          },
          formatter: {
            enabled: false
          }
        }
      ],
      edges: [],
      canvasGroups: [
        {
          id: "panel-1",
          label: "Visual Panel",
          enabled: false,
          role: "generic",
          color: "#dbeafe",
          position: { x: 80, y: 100 },
          size: { width: 360, height: 260 }
        }
      ],
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const nextFlowNodes = moveGenericPanelChildrenInFlow(
      projectToFlowNodes(project),
      project,
      "panel-1",
      { dx: 80, dy: 60 }
    );

    const provider = nextFlowNodes.find((node) => node.id === "provider-1");
    expect(provider?.position).toEqual({ x: 120, y: 140 });
  });
});
