import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/app/App";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders the editor hero", () => {
    render(<App />);
    expect(screen.getByText(/Build and publish Clash configs visually/i)).toBeInTheDocument();
  });

  it("adds a new proxy group from the palette", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("6 groups")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add proxyGroup" }));

    expect(screen.getByText("7 groups")).toBeInTheDocument();
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

    const sourceNode = screen.getByText("lib_json");
    fireEvent.doubleClick(sourceNode);

    expect(await screen.findByRole("dialog", { name: "Source servers" })).toBeInTheDocument();
    expect(await screen.findByText("Test node")).toBeInTheDocument();
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
});
