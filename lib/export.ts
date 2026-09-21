// Export aller sichtbaren Inhalte als Markdown mit Metadaten (YAML-Frontmatter).
// Hält jeden späteren Wechsel offen – kein Lock-in.

import JSZip from "jszip";
import type { Bereich, EintragVoll, ProtokollPunkt } from "./data/types";
import { slugAus } from "./regeln";

function yamlWert(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return `[${v.map((x) => yamlWert(x)).join(", ")}]`;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(String(v));
}

function zeit(sek: number): string {
  const m = Math.floor(sek / 60);
  const s = Math.floor(sek % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function eintragAlsMarkdown(e: EintragVoll, protokoll: ProtokollPunkt[] = []): string {
  const kopf: Record<string, unknown> = {
    id: e.id,
    titel: e.titel,
    art: e.art,
    quelle: e.quelle,
    bereich: e.bereich?.name ?? "Eingang",
    sichtbarkeit: e.sichtbarkeit,
    tags: e.tags.map((t) => t.name),
    erstellt: e.erstelltAm,
    von: e.ersteller?.name ?? null,
    datei: e.dateiName,
  };
  const zeilen = ["---", ...Object.entries(kopf).map(([k, v]) => `${k}: ${yamlWert(v)}`), "---", "", `# ${e.titel}`, ""];
  const mitTranskript = e.art === "meeting" && !!e.transkript?.length;
  if (e.inhalt.trim() && !mitTranskript) zeilen.push(e.inhalt.trim(), "");
  const entscheidungen = protokoll.filter((p) => p.typ === "entscheidung");
  const offen = protokoll.filter((p) => p.typ === "offen");
  if (entscheidungen.length) zeilen.push("## Entscheidungen", "", ...entscheidungen.map((p) => `- ${p.text}`), "");
  if (offen.length)
    zeilen.push(
      "## Offene Punkte",
      "",
      ...offen.map((p) => `- [${p.erledigt ? "x" : " "}] ${p.text}${p.verantwortlich ? ` (${p.verantwortlich})` : ""}`),
      "",
    );
  if (mitTranskript && e.transkript) {
    zeilen.push("## Transkript", "", ...e.transkript.map((s) => `**${zeit(s.start)} ${s.sprecher ?? ""}** ${s.text}`), "");
  }
  return zeilen.join("\n");
}

export async function exportZip(
  bereiche: Bereich[],
  eintraege: EintragVoll[],
  protokolle: Record<string, ProtokollPunkt[]>,
): Promise<Uint8Array> {
  const zip = new JSZip();
  const ordner = new Map(bereiche.map((b) => [b.id, `${b.art}/${b.slug}`]));
  const benutzt = new Set<string>();
  for (const e of eintraege) {
    const basis = e.bereichId ? (ordner.get(e.bereichId) ?? "unbekannt") : "eingang";
    let name = `${basis}/${e.erstelltAm.slice(0, 10)}-${slugAus(e.titel) || "eintrag"}.md`;
    for (let i = 2; benutzt.has(name); i++) name = name.replace(/(-\d+)?\.md$/, `-${i}.md`);
    benutzt.add(name);
    zip.file(name, eintragAlsMarkdown(e, protokolle[e.id] ?? []));
  }
  zip.file(
    "bereiche.json",
    JSON.stringify(
      bereiche.map((b) => ({ name: b.name, art: b.art, slug: b.slug, beschreibung: b.beschreibung, sichtbarkeit: b.sichtbarkeit })),
      null,
      2,
    ),
  );
  zip.file(
    "LIESMICH.md",
    "# Export CoFunction Wissensplattform\n\nJeder Eintrag ist eine Markdown-Datei mit Metadaten im Kopf.\nOriginaldateien (Audio, PDFs) liegen im Supabase-Speicher und sind hier nicht enthalten.\n",
  );
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
