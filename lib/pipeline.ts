// Die gemeinsame Pipeline: Jeder Eingangsweg (App, Mail, Upload …) legt einen Eintrag an.
// Danach läuft für alle Wege dasselbe: Text gewinnen → Regelwerk anwenden → fertig.
//
//   Adapter ─► Rohe Eingabe (Eintrag + Datei) ─► Text gewinnen ─► Tags per Regel ─► Ablage
//
// Die Zuordnung zu Projekt/Area passiert NICHT hier, sondern durch Menschen
// (beim Erfassen, über die Mail-Adresse oder im Eingang).

import { fachvokabular, wendeRegelnAn } from "./regeln";
import { istAudio, textAusDatei } from "./extraktion";
import { transkribiere, TranskriptionNichtKonfiguriert } from "./transkription";
import type { Eintrag, Repo } from "./data/types";

/** Titel aus dem ersten Satz, sonst „Sprachnotiz vom …“. Deterministisch. */
export function automatischerTitel(text: string, art: Eintrag["art"], datum: Date = new Date()): string {
  const bereinigt = text.replace(/^Sprecher \d+:\s*/gm, "").replace(/\s+/g, " ").trim();
  if (bereinigt) {
    const satz = bereinigt.split(/(?<=[.!?])\s/)[0];
    if (satz.length <= 70) return satz.replace(/[.!?]+$/, "");
    const kurz = satz.slice(0, 70);
    return `${kurz.slice(0, kurz.lastIndexOf(" ") > 30 ? kurz.lastIndexOf(" ") : 70)} …`;
  }
  const zeit = datum.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
  const art_ = art === "meeting" ? "Meeting" : art === "sprache" ? "Sprachnotiz" : "Eintrag";
  return `${art_} vom ${zeit}`;
}

/** Wendet das Regelwerk auf einen Eintrag an und ersetzt dessen Regel-Tags. */
export async function regelnAnwenden(repo: Repo, e: Pick<Eintrag, "id" | "titel" | "inhalt">) {
  const regeln = await repo.regeln();
  const treffer = wendeRegelnAn(`${e.titel}\n${e.inhalt}`, regeln);
  await repo.tagsErsetzen(
    e.id,
    "regel",
    treffer.map((t) => ({ name: t.tag, regelWort: t.wort })),
  );
  return treffer;
}

/** Nach Änderungen am Regelwerk: alle Einträge neu verschlagworten. Manuelle Tags bleiben. */
export async function alleRegelnNeuAnwenden(repo: Repo): Promise<number> {
  const eintraege = await repo.eintraege({ limit: 10000 });
  for (const e of eintraege) await regelnAnwenden(repo, e);
  return eintraege.length;
}

/**
 * Verarbeitet einen Eintrag im Status „verarbeitung“.
 * Fehler landen am Eintrag (Status „fehler“) und können über „Erneut versuchen“ wiederholt werden.
 */
export async function verarbeiteEintrag(repo: Repo, id: string): Promise<void> {
  const e = await repo.eintrag(id);
  if (!e) return;
  const versuche = Number(e.meta.versuche ?? 0) + 1;
  let titel = e.titel;
  let inhalt = e.inhalt;
  let status: Eintrag["status"] = "bereit";
  const meta: Record<string, unknown> = { ...e.meta, versuche };

  try {
    // 1) Sprache → Text
    const audio = e.audioPfad ?? (e.dateiPfad && istAudio(e.dateiTyp, e.dateiName) ? e.dateiPfad : null);
    if (audio && !e.transkript) {
      try {
        const daten = await repo.dateiLesen(audio);
        const ergebnis = await transkribiere({
          daten,
          dateiName: e.dateiName ?? "aufnahme.webm",
          sprecherTrennen: e.art === "meeting",
          fachvokabular: fachvokabular(await repo.regeln()),
        });
        inhalt = inhalt.trim() ? `${inhalt.trim()}\n\n${ergebnis.text}` : ergebnis.text;
        if (ergebnis.sekunden) meta.dauer = Math.round(ergebnis.sekunden);
        if (ergebnis.sprache) meta.sprache = ergebnis.sprache;
        await repo.eintragAktualisieren(id, { transkript: ergebnis.segmente });
      } catch (fehler) {
        if (fehler instanceof TranskriptionNichtKonfiguriert) status = "ohne_transkription";
        else throw fehler;
      }
    }

    // 2) Datei → Text (PDF, Klartext)
    if (e.dateiPfad && !audio && !inhalt.trim()) {
      const daten = await repo.dateiLesen(e.dateiPfad);
      if (daten) inhalt = (await textAusDatei(daten, e.dateiTyp, e.dateiName)) ?? "";
    }

    // 3) Titel, falls automatisch vergeben
    if (meta.titelAutomatisch && inhalt.trim()) {
      titel = automatischerTitel(inhalt, e.art, new Date(e.erstelltAm));
      meta.titelAutomatisch = false;
    }

    await repo.eintragAktualisieren(id, { titel, inhalt, status, fehler: null, meta });
    // 4) Regelwerk
    await regelnAnwenden(repo, { id, titel, inhalt });
  } catch (fehler) {
    const nachricht = fehler instanceof Error ? fehler.message : String(fehler);
    await repo.eintragAktualisieren(id, { status: "fehler", fehler: nachricht.slice(0, 500), meta });
  }
}
