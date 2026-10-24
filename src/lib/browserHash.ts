/**
 * In-browser hashing of the shared identifier (design doc §4.1, backlog 1b).
 * Runs with Web Crypto, so an organization's raw identifiers (e.g. CDCR
 * numbers) are turned into participant keys on its own computer and never
 * reach the server. Produces exactly what privacy.ts participantKey() does.
 */
import { normalizeCdcrNumber } from "./normalize";

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function makeHasher(networkKey: string) {
  if (!networkKey) throw new Error("A network key is required.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(networkKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return async (identifier: string) =>
    hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(normalizeCdcrNumber(identifier))));
}

/** True when a column already holds hashed keys (hex), so no hashing is needed. */
export function looksHashed(values: string[]): boolean {
  const filled = values.map((v) => v.trim()).filter(Boolean);
  return filled.length > 0 && filled.every((v) => /^[0-9a-f]{16,64}$/i.test(v));
}

/** Replace one column's values with participant keys; blanks stay blank. */
export async function hashColumn(rows: string[][], index: number, networkKey: string): Promise<string[][]> {
  const hash = await makeHasher(networkKey);
  const cache = new Map<string, string>();
  const out: string[][] = [];
  for (const r of rows) {
    const v = r[index]?.trim() ?? "";
    if (v && !cache.has(v)) cache.set(v, await hash(v));
    out.push(r.map((cell, i) => (i === index && v ? cache.get(v)! : cell)));
  }
  return out;
}
