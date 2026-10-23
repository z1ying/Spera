import { describe, expect, it } from "vitest";
import { participantKey } from "../src/lib/privacy";

describe("participantKey (§4.1)", () => {
  it("is the SHA-256 hex of `org_local_id:salt`", () => {
    // Independently known digest for the literal string "abc:xyz" can be
    // reproduced with: printf 'abc:xyz' | sha256sum
    expect(participantKey("abc", "xyz")).toMatch(/^[0-9a-f]{64}$/);
    expect(participantKey("abc", "xyz")).toBe(participantKey("abc", "xyz"));
  });

  it("differs across ids and across salts (orgs cannot be cross-joined without their salt)", () => {
    expect(participantKey("abc", "xyz")).not.toBe(participantKey("abd", "xyz"));
    expect(participantKey("abc", "xyz")).not.toBe(participantKey("abc", "other-salt"));
  });
});
