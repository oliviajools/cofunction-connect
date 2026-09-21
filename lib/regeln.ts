// Deterministisches Regelwerk: gleicher Text + gleiche Regeln => immer dieselben Tags.
// Keine KI, keine Wahrscheinlichkeiten. Jede Zuordnung ist auf ein konkretes Wort zurückführbar.

import type { Regel } from "./data/types";

export interface RegelTreffer {
  tag: string;
  wort: string;
  regelId: string;
}

/** Kleinbuchstaben + Unicode-Normalform, damit „Ä“ und „Ä“ gleich behandelt werden. */
export function normalisiere(text: string): string {
  return text.normalize("NFC").toLocaleLowerCase("de-DE");
}

/** Tag-Namen einheitlich: ohne #, klein, Leerzeichen → Bindestrich. */
export function tagName(roh: string): string {
  return normalisiere(roh)
    .replace(/^#+/, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Begriff aufbereiten: getrimmt, klein, ein abschließendes * (Präfix-Schreibweise) entfernt. */
export function begriffNormalisieren(roh: string): string {
  return normalisiere(roh).trim().replace(/\*+$/, "");
}

/**
 * Wendet alle aktiven Regeln auf einen Text an.
 * Ein Begriff trifft, wenn er als Zeichenfolge im Text vorkommt (auch in Komposita:
 * „Knie“ trifft „Kniebeuge“). Pro Tag zählt der erste passende Begriff der Regel.
 * Ergebnis ist nach Tag sortiert, damit die Reihenfolge stabil ist.
 */
export function wendeRegelnAn(text: string, regeln: Regel[]): RegelTreffer[] {
  const t = normalisiere(text);
  const treffer = new Map<string, RegelTreffer>();
  for (const regel of regeln) {
    if (!regel.aktiv) continue;
    const tag = tagName(regel.tag);
    if (!tag || treffer.has(tag)) continue;
    for (const roh of regel.begriffe) {
      const begriff = begriffNormalisieren(roh);
      if (begriff.length < 2) continue;
      if (t.includes(begriff)) {
        treffer.set(tag, { tag, wort: begriff, regelId: regel.id });
        break;
      }
    }
  }
  return [...treffer.values()].sort((a, b) => a.tag.localeCompare(b.tag, "de"));
}

/** #tags aus einer Betreffzeile: „Studie Knie #hockey #reha“ → ["hockey", "reha"] */
export function betreffTags(betreff: string): string[] {
  const gefunden = betreff.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
  return [...new Set(gefunden.map(tagName).filter(Boolean))];
}

/** Betreff ohne die #tags, für den Titel. */
export function betreffOhneTags(betreff: string): string {
  return betreff.replace(/#[\p{L}\p{N}_-]+/gu, "").replace(/\s+/g, " ").trim();
}

/** Aus einem Namen einen Kurznamen für Mail-Adressen machen: „Leistungsstützpunkt Hockey“ → „leistungsstuetzpunkt-hockey“ */
export function slugAus(name: string): string {
  return normalisiere(name)
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Begriffe-Eingabe „Knie, Kniegelenk; Meniskus“ → ["Knie", "Kniegelenk", "Meniskus"] */
export function begriffeAusEingabe(eingabe: string): string[] {
  return [
    ...new Set(
      eingabe
        .split(/[,;\n]/)
        .map((b) => b.trim())
        .filter((b) => b.length >= 2),
    ),
  ];
}

/** Alle Begriffe aller aktiven Regeln – dient als Fachvokabular für die Transkription. */
export function fachvokabular(regeln: Regel[], max = 100): string[] {
  const woerter = new Set<string>();
  for (const r of regeln) {
    if (!r.aktiv) continue;
    for (const b of r.begriffe) {
      const w = b.trim().replace(/\*+$/, "");
      if (w.length >= 3) woerter.add(w);
    }
  }
  return [...woerter].slice(0, max);
}
