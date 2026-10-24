import { describe, expect, it } from "vitest";
import { normalizeCdcrNumber, participantKey } from "../src/lib/privacy";

describe("participantKey (§4.1 v1.6)", () => {
  it("is HMAC-SHA256(network_key, normalized CDCR number), hex", () => {
    // Reproduce with: printf 'AB1234' | openssl dgst -sha256 -hmac 'test-network-key'
    expect(participantKey("AB1234", "test-network-key")).toBe(
      "91cb0e881fda573818d60c7cae1373861d7d348832f5f7d7f1ed4a0a681763c1",
    );
  });

  it("links the same person across differently formatted sources", () => {
    expect(normalizeCdcrNumber(" ab-1234 ")).toBe("AB1234");
    expect(participantKey(" ab-1234 ", "k")).toBe(participantKey("AB1234", "k"));
  });

  it("cannot be recomputed without the network key", () => {
    expect(participantKey("AB1234", "k")).not.toBe(participantKey("AB1235", "k"));
    expect(participantKey("AB1234", "k")).not.toBe(participantKey("AB1234", "other-key"));
    expect(() => participantKey("AB1234", "")).toThrow();
  });
});

describe("browser hashing (backlog 1b)", () => {
  it("produces exactly the server's participantKey", async () => {
    const { hashColumn, looksHashed } = await import("../src/lib/browserHash");
    const out = await hashColumn([["ab-1234", "x"], ["", "y"]], 0, "test-network-key");
    expect(out[0][0]).toBe(participantKey("AB1234", "test-network-key"));
    expect(out[0][1]).toBe("x");
    expect(out[1][0]).toBe("");
    expect(looksHashed([out[0][0]])).toBe(true);
    expect(looksHashed(["DEMO-1001"])).toBe(false);
  });
});
