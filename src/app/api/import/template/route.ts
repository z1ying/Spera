/**
 * Blank enrollment template (backlog 2b) for organizations starting from
 * scratch. Headers match the data standard and map automatically on import;
 * the example row shows the expected formats and can be deleted.
 */
const TEMPLATES = {
  en: {
    file: "impactlink_template_en.csv",
    headers: ["cdcr_number", "program_name", "start_date", "end_date", "completed", "credits"],
    example: ["EXAMPLE-0001", "GED Prep", "2025-01-15", "2025-06-30", "yes", "MCC"],
  },
  es: {
    file: "impactlink_plantilla_es.csv",
    headers: ["numero_cdcr", "programa", "fecha_inicio", "fecha_fin", "completado", "creditos"],
    example: ["EXAMPLE-0001", "Preparación GED", "2025-01-15", "2025-06-30", "sí", "MCC"],
  },
} as const;

export function GET(req: Request) {
  const lang = new URL(req.url).searchParams.get("lang") === "es" ? "es" : "en";
  const t = TEMPLATES[lang];
  // UTF-8 BOM so Excel opens accented characters correctly.
  const body = "﻿" + [t.headers.join(","), t.example.join(",")].join("\n") + "\n";
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${t.file}"`,
    },
  });
}
