"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { DEMO_NUTZER_COOKIE, getRepo } from "@/lib/data";
import type { BereichArt, EintragArt, Sichtbarkeit, UploadZiel } from "@/lib/data/types";
import { istAudio } from "@/lib/extraktion";
import { sichererDateiname } from "@/lib/mail";
import { alleRegelnNeuAnwenden, automatischerTitel, regelnAnwenden, verarbeiteEintrag } from "@/lib/pipeline";
import { begriffeAusEingabe, tagName } from "@/lib/regeln";
import { istDemo } from "@/lib/config";

// IDs: UUIDs (Supabase) oder Demo-IDs – aber nie Zeichen, die Filterausdrücke verändern könnten.
const Id = z.string().regex(/^[a-zA-Z0-9-]{1,64}$/);
const OptId = Id.nullable();
const SichtbarkeitS = z.enum(["team", "privat"]);

export type Ergebnis<T = undefined> = { ok: true; daten?: T } | { ok: false; fehler: string };

function neuLaden() {
  revalidatePath("/", "layout");
}

function fehlerText(e: unknown): string {
  return e instanceof Error ? e.message : "Unbekannter Fehler";
}

// ───────────── Erfassen ─────────────

export async function uploadStarten(dateiName: string): Promise<Ergebnis<UploadZiel>> {
  try {
    const repo = await getRepo();
    const nutzer = await repo.nutzer();
    const pfad = `${nutzer.id}/${new Date().getFullYear()}/${randomUUID()}-${sichererDateiname(dateiName)}`;
    return { ok: true, daten: await repo.uploadStarten(pfad) };
  } catch (e) {
    return { ok: false, fehler: fehlerText(e) };
  }
}

const AufnahmeS = z.object({
  pfad: z.string().min(3).max(300),
  art: z.enum(["sprache", "meeting", "datei"]),
  dateiName: z.string().max(200),
  dateiTyp: z.string().max(120),
  groesse: z.number().nonnegative().optional(),
  dauer: z.number().nonnegative().optional(),
  bereichId: OptId,
  sichtbarkeit: SichtbarkeitS.default("team"),
  notiz: z.string().max(20000).optional(),
});

/** Nach dem Hochladen: Eintrag anlegen und Verarbeitung (Transkription/Text, Regeln) anstoßen. */
export async function hochgeladenAbschliessen(eingabe: z.input<typeof AufnahmeS>): Promise<Ergebnis<{ id: string }>> {
  const d = AufnahmeS.safeParse(eingabe);
  if (!d.success) return { ok: false, fehler: "Ungültige Angaben" };
  try {
    const repo = await getRepo();
    const nutzer = await repo.nutzer();
    if (!d.data.pfad.startsWith(`${nutzer.id}/`)) return { ok: false, fehler: "Ungültiger Speicherpfad" };
    const audio = d.data.art !== "datei" || istAudio(d.data.dateiTyp, d.data.dateiName);
    const art: EintragArt = d.data.art === "datei" && audio ? "sprache" : d.data.art;
    const e = await repo.eintragAnlegen({
      art,
      quelle: d.data.art === "datei" ? "upload" : "app",
      titel: d.data.art === "datei" ? d.data.dateiName : automatischerTitel("", art),
      inhalt: d.data.notiz ?? "",
      bereichId: d.data.bereichId,
      sichtbarkeit: d.data.sichtbarkeit,
      status: "verarbeitung",
      audioPfad: audio ? d.data.pfad : null,
      dateiPfad: audio ? null : d.data.pfad,
      dateiName: d.data.dateiName,
      dateiTyp: d.data.dateiTyp,
      meta: { titelAutomatisch: d.data.art !== "datei", dauer: d.data.dauer, groesse: d.data.groesse },
    });
    after(() => verarbeiteEintrag(repo, e.id));
    neuLaden();
    return { ok: true, daten: { id: e.id } };
  } catch (e) {
    return { ok: false, fehler: fehlerText(e) };
  }
}

const TextS = z.object({
  titel: z.string().max(300),
  inhalt: z.string().max(100000),
  art: z.enum(["text", "idee"]),
  bereichId: OptId,
  sichtbarkeit: SichtbarkeitS.default("team"),
});

export async function textErfassen(eingabe: z.input<typeof TextS>): Promise<Ergebnis<{ id: string }>> {
  const d = TextS.safeParse(eingabe);
  if (!d.success) return { ok: false, fehler: "Ungültige Angaben" };
  const titel = d.data.titel.trim() || automatischerTitel(d.data.inhalt, d.data.art);
  if (!titel.trim() && !d.data.inhalt.trim()) return { ok: false, fehler: "Bitte etwas eingeben" };
  try {
    const repo = await getRepo();
    const e = await repo.eintragAnlegen({ ...d.data, titel, quelle: "app" });
    await regelnAnwenden(repo, e);
    neuLaden();
    return { ok: true, daten: { id: e.id } };
  } catch (e) {
    return { ok: false, fehler: fehlerText(e) };
  }
}

// ───────────── Einträge bearbeiten ─────────────

export async function zuordnen(eintragId: string, bereichId: string | null): Promise<Ergebnis> {
  if (!Id.safeParse(eintragId).success || !OptId.safeParse(bereichId).success) return { ok: false, fehler: "Ungültige Angaben" };
  try {
    const repo = await getRepo();
    await repo.zuordnen(eintragId, bereichId);
    neuLaden();
    return { ok: true };
  } catch (e) {
    return { ok: false, fehler: fehlerText(e) };
  }
}

export async function eintragSpeichern(id: string, titel: string, inhalt: string): Promise<Ergebnis> {
  if (!Id.safeParse(id).success) return { ok: false, fehler: "Ungültige Angaben" };
  try {
    const repo = await getRepo();
    await repo.eintragAktualisieren(id, { titel: titel.slice(0, 300), inhalt: inhalt.slice(0, 200000) });
    await regelnAnwenden(repo, { id, titel, inhalt });
    neuLaden();
    return { ok: true };
  } catch (e) {
    return { ok: false, fehler: fehlerText(e) };
  }
}

export async function sichtbarkeitSetzen(id: string, sichtbarkeit: Sichtbarkeit): Promise<Ergebnis> {
  if (!Id.safeParse(id).success || !SichtbarkeitS.safeParse(sichtbarkeit).success) return { ok: false, fehler: "Ungültige Angaben" };
  try {
    await (await getRepo()).eintragAktualisieren(id, { sichtbarkeit });
    neuLaden();
    return { ok: true };
  } catch (e) {
    return { ok: false, fehler: fehlerText(e) };
  }
}

export async function eintragLoeschen(id: string, zurueck: string = "/") {
  if (!Id.safeParse(id).success) return;
  await (await getRepo()).eintragLoeschen(id);
  neuLaden();
  // Nur interne Pfade (kein „//andere-seite.de“)
  redirect(/^\/(?!\/)[\w\-/]*$/.test(zurueck) ? zurueck : "/");
}

export async function erneutVerarbeiten(id: string): Promise<Ergebnis> {
  if (!Id.safeParse(id).success) return { ok: false, fehler: "Ungültige Angaben" };
  const repo = await getRepo();
  await repo.eintragAktualisieren(id, { status: "verarbeitung", fehler: null });
  after(() => verarbeiteEintrag(repo, id));
  neuLaden();
  return { ok: true };
}

export async function tagHinzufuegen(id: string, name: string): Promise<Ergebnis> {
  if (!Id.safeParse(id).success || !tagName(name)) return { ok: false, fehler: "Ungültiger Tag" };
  await (await getRepo()).tagHinzufuegen(id, name, "manuell");
  neuLaden();
  return { ok: true };
}

export async function tagEntfernen(id: string, name: string): Promise<Ergebnis> {
  if (!Id.safeParse(id).success) return { ok: false, fehler: "Ungültige Angaben" };
  await (await getRepo()).tagEntfernen(id, name);
  neuLaden();
  return { ok: true };
}

export async function verknuepfen(a: string, b: string): Promise<Ergebnis> {
  if (!Id.safeParse(a).success || !Id.safeParse(b).success) return { ok: false, fehler: "Ungültige Angaben" };
  await (await getRepo()).verknuepfen(a, b);
  neuLaden();
  return { ok: true };
}

export async function entknuepfen(a: string, b: string): Promise<Ergebnis> {
  if (!Id.safeParse(a).success || !Id.safeParse(b).success) return { ok: false, fehler: "Ungültige Angaben" };
  await (await getRepo()).entknuepfen(a, b);
  neuLaden();
  return { ok: true };
}

export async function verknuepfungSuchen(q: string, ausser: string): Promise<{ id: string; titel: string; bereich: string }[]> {
  if (q.trim().length < 2) return [];
  const treffer = await (await getRepo()).eintraege({ suche: q, limit: 8 });
  return treffer.filter((t) => t.id !== ausser).map((t) => ({ id: t.id, titel: t.titel, bereich: t.bereich?.name ?? "Eingang" }));
}

// ───────────── Meeting-Protokoll ─────────────

export async function protokollPunktAnlegen(eintragId: string, typ: "entscheidung" | "offen", text: string, verantwortlich?: string) {
  if (!Id.safeParse(eintragId).success || !text.trim()) return;
  await (await getRepo()).protokollPunktAnlegen(eintragId, typ, text.trim().slice(0, 2000), verantwortlich?.trim() || null);
  neuLaden();
}

export async function protokollPunktUmschalten(id: string, erledigt: boolean) {
  if (!Id.safeParse(id).success) return;
  await (await getRepo()).protokollPunktAktualisieren(id, { erledigt });
  neuLaden();
}

export async function protokollPunktLoeschen(id: string) {
  if (!Id.safeParse(id).success) return;
  await (await getRepo()).protokollPunktLoeschen(id);
  neuLaden();
}

export async function bausteinAnlegen(meetingId: string, titel: string, text: string, von?: number, bis?: number): Promise<Ergebnis> {
  if (!Id.safeParse(meetingId).success || !titel.trim()) return { ok: false, fehler: "Bitte einen Titel angeben" };
  const repo = await getRepo();
  const meeting = await repo.eintrag(meetingId);
  if (!meeting) return { ok: false, fehler: "Meeting nicht gefunden" };
  const e = await repo.eintragAnlegen({
    art: "baustein",
    titel: titel.trim().slice(0, 300),
    inhalt: text.trim(),
    bereichId: meeting.bereichId,
    sichtbarkeit: meeting.sichtbarkeit,
    elternId: meetingId,
    meta: { von, bis },
  });
  await regelnAnwenden(repo, e);
  neuLaden();
  return { ok: true };
}

// ───────────── Bereiche ─────────────

const BereichS = z.object({
  name: z.string().trim().min(1).max(120),
  art: z.enum(["projekt", "area", "ressource", "archiv"]),
  beschreibung: z.string().max(2000).default(""),
  sichtbarkeit: SichtbarkeitS.default("team"),
  elternId: OptId.default(null),
});

export async function bereichAnlegen(formData: FormData) {
  const d = BereichS.safeParse({
    name: formData.get("name"),
    art: formData.get("art"),
    beschreibung: formData.get("beschreibung") ?? "",
    sichtbarkeit: formData.get("sichtbarkeit") ?? "team",
    elternId: formData.get("elternId") || null,
  });
  if (!d.success) return;
  const b = await (await getRepo()).bereichAnlegen(d.data);
  neuLaden();
  redirect(`/bereiche/${b.id}`);
}

export async function bereichAktualisieren(
  id: string,
  patch: { name?: string; beschreibung?: string; art?: BereichArt; aktiv?: boolean },
): Promise<Ergebnis> {
  if (!Id.safeParse(id).success) return { ok: false, fehler: "Ungültige Angaben" };
  const sauber: typeof patch = {};
  if (patch.name?.trim()) sauber.name = patch.name.trim().slice(0, 120);
  if (patch.beschreibung !== undefined) sauber.beschreibung = patch.beschreibung.slice(0, 2000);
  if (patch.art && ["projekt", "area", "ressource", "archiv"].includes(patch.art)) sauber.art = patch.art;
  if (patch.aktiv !== undefined) sauber.aktiv = patch.aktiv;
  await (await getRepo()).bereichAktualisieren(id, sauber);
  neuLaden();
  return { ok: true };
}

// ───────────── Regelwerk ─────────────

export async function regelAnlegen(begriffe: string, tag: string): Promise<Ergebnis> {
  const liste = begriffeAusEingabe(begriffe);
  const name = tagName(tag);
  if (!liste.length || !name) return { ok: false, fehler: "Bitte Begriffe und einen Tag angeben" };
  await (await getRepo()).regelAnlegen(liste, name);
  neuLaden();
  return { ok: true };
}

export async function regelBearbeiten(id: string, begriffe: string, tag: string): Promise<Ergebnis> {
  const liste = begriffeAusEingabe(begriffe);
  const name = tagName(tag);
  if (!Id.safeParse(id).success || !liste.length || !name) return { ok: false, fehler: "Bitte Begriffe und einen Tag angeben" };
  await (await getRepo()).regelAktualisieren(id, { begriffe: liste, tag: name });
  neuLaden();
  return { ok: true };
}

export async function regelUmschalten(id: string, aktiv: boolean) {
  if (!Id.safeParse(id).success) return;
  await (await getRepo()).regelAktualisieren(id, { aktiv });
  neuLaden();
}

export async function regelLoeschen(id: string) {
  if (!Id.safeParse(id).success) return;
  await (await getRepo()).regelLoeschen(id);
  neuLaden();
}

export async function regelnNeuAnwenden(): Promise<Ergebnis<{ anzahl: number }>> {
  const anzahl = await alleRegelnNeuAnwenden(await getRepo());
  neuLaden();
  return { ok: true, daten: { anzahl } };
}

// ───────────── Konto ─────────────

export async function demoNutzerWechseln(id: string) {
  if (!istDemo || !Id.safeParse(id).success) return;
  (await cookies()).set(DEMO_NUTZER_COOKIE, id, { path: "/", sameSite: "lax" });
  neuLaden();
}

export async function abmelden() {
  if (!istDemo) {
    const { supabaseServer } = await import("@/lib/supabase/server");
    await (await supabaseServer()).auth.signOut();
  }
  redirect("/login");
}
