import { describe, expect, it } from "vitest";

import { createDemoProject, renderClashYaml, validateProject } from "../src/index";

describe("renderClashYaml", () => {
  it("creates a valid YAML document for the demo project", () => {
    const project = createDemoProject();
    const yaml = renderClashYaml(project);

    expect(validateProject(project)).toEqual([]);
    expect(yaml).toContain("proxy-providers:");
    expect(yaml).toContain("proxy-groups:");
    expect(yaml).toContain("rules:");
    expect(yaml).toContain("AI Services");
    expect(yaml).toContain("Rest Of World");
    expect(yaml).toContain("health-check:");
    expect(yaml).not.toContain("healthCheck:");
    expect(yaml).toMatch(/url:\s+"https?:\/\/.+"/);
  });
});
