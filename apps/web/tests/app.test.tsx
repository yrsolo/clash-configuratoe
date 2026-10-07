import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoProject } from "@clash-configuratoe/schema";
import starterProject from "../../../default/new.json";

import { App } from "../src/app/App";
import { saveWorkspaceSession } from "../src/shared/workspaceAuth";
import { loadDraft } from "../src/shared/storage";

const initialGroupCount = starterProject.nodes.filter(node => node.kind === "proxyGroup").length;
const initialRuleCount = starterProject.nodes.filter(node => node.kind === "ruleSet").length;

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("restores exported JSON with its layout and sources under a new project identity", async () => {
    render(<App />);
    const user = userEvent.setup();
    const backup = { ...structuredClone(starterProject), id: "old-published-project", name: "Restored backup" };
    fireEvent.change(screen.getByPlaceholderText("Paste project JSON or Clash YAML here"), { target: { value: JSON.stringify(backup) } });
    await user.click(screen.getByRole("button", { name: "Import into graph" }));
    await waitFor(() => expect(loadDraft()?.name).toBe("Restored backup"));
    const stored = loadDraft()!;
    expect(stored.name).toBe("Restored backup");
    expect(stored.id).not.toBe(backup.id);
    expect(stored.edges).toEqual(backup.edges);
    expect(stored.canvasGroups).toEqual(backup.canvasGroups);
    expect(stored.nodes.filter((node: { kind: string }) => node.kind !== "globalSettings")).toEqual(backup.nodes.filter(node => node.kind !== "globalSettings"));
  });

  it("keeps the current project and shows an error for invalid JSON", async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText("Paste project JSON or Clash YAML here"), { target: { value: '{"nodes":' } });
    await userEvent.setup().click(screen.getByRole("button", { name: "Import into graph" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось импортировать");
    expect(screen.getByText(`${initialGroupCount} groups`)).toBeInTheDocument();
  });

  it("renders the editor hero", () => {
    render(<App />);
    expect(screen.getByText(/Build and publish Clash configs visually/i)).toBeInTheDocument();
  });

  it("adds a new proxy group from the toolbar dropdown", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText(`${initialGroupCount} groups`)).toBeInTheDocument();
    await user.click(screen.getByText("Добавить ноду"));
    await user.click(screen.getByRole("button", { name: "Proxy group" }));

    expect(screen.getByText(`${initialGroupCount + 1} groups`)).toBeInTheDocument();
  });

  it("adds a VLESS link node from the toolbar dropdown", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Добавить ноду"));
    await user.click(screen.getByRole("button", { name: "VLESS link" }));

    expect(screen.getByText("VLESS Reality")).toBeInTheDocument();
  });

  it("shows the server inside a VLESS link node on double click", async () => {
    render(<App />);

    await userEvent.setup().click(screen.getByText("Добавить ноду"));
    await userEvent.setup().click(screen.getByRole("button", { name: "VLESS link" }));
    fireEvent.doubleClick(screen.getByText("VLESS Reality"));

    expect(await screen.findByRole("dialog", { name: "Source servers" })).toBeInTheDocument();
    expect(screen.getByText("example.com:443")).toBeInTheDocument();
    expect(screen.getByText("1 logical servers")).toBeInTheDocument();
  });

  it("adds a preset rule node from the toolbar dropdown", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText(`${initialRuleCount} rule nodes`)).toBeInTheDocument();
    await user.click(screen.getByText("Добавить правило"));
    await user.click(screen.getByRole("button", { name: "Russian Services" }));

    expect(screen.getByText(`${initialRuleCount + 1} rule nodes`)).toBeInTheDocument();
  });

  it("supports undo and redo for project edits", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText(`${initialGroupCount} groups`)).toBeInTheDocument();

    await user.click(screen.getByText("Добавить ноду"));
    await user.click(screen.getByRole("button", { name: "Proxy group" }));
    expect(screen.getByText(`${initialGroupCount + 1} groups`)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText(`${initialGroupCount} groups`)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByText(`${initialGroupCount + 1} groups`)).toBeInTheDocument();
  });

  it("removes an edge on double click", async () => {
    render(<App />);

    const getEdgeCount = () => document.querySelectorAll(".react-flow__edge").length;
    await waitFor(() => expect(getEdgeCount()).toBeGreaterThan(0));
    const before = getEdgeCount();

    const firstEdge = document.querySelector(".react-flow__edge");
    expect(firstEdge).not.toBeNull();

    fireEvent.doubleClick(firstEdge as Element);

    await waitFor(() => expect(getEdgeCount()).toBeLessThan(before));
  });

  it("opens the yaml preview in a larger dialog", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Published YAML Preview/i }));
    expect(screen.getByRole("dialog", { name: "Expanded YAML preview" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Expanded YAML preview" })).not.toBeInTheDocument()
    );
  });

  it("exports the current scheme as json", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((blob: Blob | MediaSource) => {
      void blob;
      return "blob:project-json";
    });
    const revokeObjectURL = vi.fn(() => undefined);
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    Object.assign(URL, {
      createObjectURL,
      revokeObjectURL
    });

    try {
      render(<App />);

      await user.click(screen.getByRole("button", { name: "Export JSON" }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const firstCall = createObjectURL.mock.calls[0];
      expect(firstCall).toBeDefined();
      const blob = firstCall?.[0];
      expect(blob).toBeInstanceOf(Blob);
      expect((blob as Blob).type).toContain("application/json");
      expect((blob as Blob).size).toBeGreaterThan(0);
      expect(anchorClick).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:project-json");
    } finally {
      Object.assign(URL, {
        createObjectURL: originalCreateObjectURL,
        revokeObjectURL: originalRevokeObjectURL
      });
    }
  });

  it("opens source inspect on provider double click", async () => {
    const fetchMock = vi.spyOn(window, "fetch");
    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input.url);

      if (url.includes("/api/source/inspect")) {
        const bodyText = typeof init?.body === "string" ? init.body : "";
        const parsedBody = bodyText ? JSON.parse(bodyText) : {};
        const withProbe = Boolean(parsedBody.runProbe);

        return new Response(
          JSON.stringify({
            sourceUrl: "https://example.com/sub",
            probeUrl: withProbe ? "http://www.gstatic.com/generate_204" : undefined,
            total: 1,
            proxies: [
              {
                name: "Test node",
                type: "vless",
                server: "example.com",
                port: 443,
                detourServer: "upstream.example.com",
                detourPort: 1080,
                detourType: "socks5",
                pingMs: withProbe ? 123 : null,
                status: withProbe ? "ok" : "not-run"
              }
            ]
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        ) as Response;
      }

      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    render(<App />);

    const sourceNode = screen.getByText("Subscription 1");
    fireEvent.doubleClick(sourceNode);

    expect(await screen.findByRole("dialog", { name: "Source servers" })).toBeInTheDocument();
    expect(await screen.findByText("source_1 Test node")).toBeInTheDocument();
    expect(screen.getByText("n/a")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/source/inspect"),
      expect.objectContaining({
        method: "POST"
      })
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Run probe" }));

    expect(screen.getByText("123 ms")).toBeInTheDocument();
    expect(screen.getByText("Detour: upstream.example.com:1080 (socks5)")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/source/inspect"),
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("does not autosave a restored workspace project without user edits", async () => {
    const project = createDemoProject();
    const session = {
      userName: "loop-check",
      userKey: "workspace-user-key",
      lastProjectId: project.id
    };
    const fetchMock = vi.spyOn(window, "fetch");

    saveWorkspaceSession(session);

    fetchMock.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input.url);

      if (url.includes("/api/workspace/session/restore")) {
        return new Response(
          JSON.stringify({
            session,
            index: {
              userName: session.userName,
              createdAt: project.meta.createdAt,
              updatedAt: project.meta.updatedAt,
              activeProjectId: project.id,
              projects: [
                {
                  id: project.id,
                  name: project.name,
                  description: project.description,
                  updatedAt: project.meta.updatedAt,
                  isDefault: false,
                  source: "workspace"
                }
              ]
            },
            activeProject: project,
            secrets: null
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        ) as Response;
      }

      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    render(<App />);

    await screen.findByText(/Build and publish Clash configs visually/i);
    await new Promise((resolve) => window.setTimeout(resolve, 1200));

    const saveCalls = fetchMock.mock.calls.filter(([input]) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input.url);
      return url.includes("/api/workspace/projects/save");
    });

    expect(saveCalls).toHaveLength(0);
  });
});
