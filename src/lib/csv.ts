/**
 * Minimal RFC-4180 CSV parser (quoted fields, embedded commas/quotes/newlines,
 * CRLF, UTF-8 BOM). Shared by the seed script and the import wizard.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

export interface ParsedCsv {
  headers: string[];
  /** Data rows as arrays aligned with `headers` (short rows padded with ""). */
  rows: string[][];
}

export function parseCsvTable(text: string): ParsedCsv {
  const [header = [], ...body] = parseCsvRows(text);
  const headers = header.map((h) => h.trim());
  return { headers, rows: body.map((r) => headers.map((_, i) => r[i] ?? "")) };
}

/** Rows as header-keyed records. */
export function parseCsv(text: string): Record<string, string>[] {
  const { headers, rows } = parseCsvTable(text);
  return rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

/** Serialize back to CSV, quoting only fields that need it. */
export function toCsv(headers: string[], rows: string[][]): string {
  const q = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers, ...rows].map((r) => r.map(q).join(",")).join("\n") + "\n";
}
