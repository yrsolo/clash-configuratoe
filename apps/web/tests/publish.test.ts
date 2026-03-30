import { describe, expect, it } from "vitest";

import { buildStablePublishedIdentity } from "../src/shared/publish";

describe("buildStablePublishedIdentity", () => {
  it("returns the same publish identity for the same workspace project", async () => {
    const session = {
      userName: "yrsolo-dev",
      userKey: "user-key-123"
    };

    const first = await buildStablePublishedIdentity(session, "project-alpha");
    const second = await buildStablePublishedIdentity(session, "project-alpha");

    expect(first).toEqual(second);
  });

  it("returns a different publish identity for a different project", async () => {
    const session = {
      userName: "yrsolo-dev",
      userKey: "user-key-123"
    };

    const first = await buildStablePublishedIdentity(session, "project-alpha");
    const second = await buildStablePublishedIdentity(session, "project-beta");

    expect(first.id).not.toEqual(second.id);
    expect(first.token).not.toEqual(second.token);
  });
});
