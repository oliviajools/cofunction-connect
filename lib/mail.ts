// Adapter „Weiterleiten per Mail“.
// Übersetzt eine eingehende Mail (Postmark-Inbound-Format) in Einträge.
// Routing ist fest geregelt:
//   wissen@…          → Eingang
//   wissen+<slug>@…   → Projekt/Area mit diesem Kurznamen
//   #tag im Betreff   → zusätzlicher Tag

import { randomUUID } from "node:crypto";
import { betreffOhneTags, betreffTags } from "./regeln";
import { istAudio } from "./extraktion";
import type { Profil, Repo } from "./data/types";

export interface MailAnhang {
  name: string;
  typ: string;
  daten: Uint8Array;
}

export interface NormalisierteMail {
  absender: string;
  betreff: string;
  text: string;
  /** Plus-Zusatz der Empfängeradresse (ohne „+“), z. B. „hockey“ */
  zusatz: string | null;
  nachrichtId: string | null;
  anhaenge: MailAnhang[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Postmark-Inbound-JSON → neutrales Format. Andere Anbieter bekommen später eine eigene Funktion. */
export function ausPostmark(p: any): NormalisierteMail {
  const empfaenger: any[] = Array.isArray(p?.ToFull) ? p.ToFull : [];
  const mitZusatz = empfaenger.find((t) => t?.MailboxHash);
  let zusatz: string | null = (p?.MailboxHash || mitZusatz?.MailboxHash || "").toString().trim().toLowerCase() || null;
  if (!zusatz) {
    const adresse = (p?.OriginalRecipient ?? p?.To ?? "").toString();
    const m = adresse.match(/\+([a-z0-9-]+)@/i);
    zusatz = m ? m[1].toLowerCase() : null;
  }
  const anhaenge: MailAnhang[] = (Array.isArray(p?.Attachments) ? p.Attachments : [])
    .filter((a: any) => a?.Content)
    .map((a: any) => ({
      name: String(a.Name ?? "anhang"),
      typ: String(a.ContentType ?? "application/octet-stream"),
      daten: Uint8Array.from(Buffer.from(String(a.Content), "base64")),
    }));
  return {
    absender: String(p?.FromFull?.Email ?? p?.From ?? "").trim().toLowerCase(),
    betreff: String(p?.Subject ?? "").trim(),
    text: String(p?.TextBody ?? p?.StrippedTextReply ?? "").trim(),
    zusatz,
    nachrichtId: p?.MessageID ? String(p.MessageID) : null,
    anhaenge,
  };
}

export function sichererDateiname(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
  return s || "datei";
}

export function speicherPfad(nutzerId: string, dateiname: string): string {
  const jahr = new Date().getFullYear();
  return `${nutzerId}/${jahr}/${randomUUID()}-${sichererDateiname(dateiname)}`;
}

export type MailErgebnis =
  | { ok: true; eintragIds: string[]; bereich: string | null }
  | { ok: false; grund: string };

/**
 * Legt die Einträge an. `repoFuer` liefert einen Zugriff im Namen der absendenden Person.
 * Nur Mails von bekannten Teammitgliedern werden angenommen.
 */
export async function mailAnnehmen(
  mail: NormalisierteMail,
  profile: Profil[],
  repoFuer: (nutzerId: string) => Promise<Repo>,
): Promise<MailErgebnis> {
  const person = profile.find((p) => p.email.toLowerCase() === mail.absender);
  if (!person) return { ok: false, grund: `Unbekannte Absenderadresse: ${mail.absender || "(leer)"}` };
  const repo = await repoFuer(person.id);

  let bereichId: string | null = null;
  let bereichName: string | null = null;
  if (mail.zusatz) {
    const b = await repo.bereichNachSlug(mail.zusatz);
    // Private Bereiche nur für ihre Besitzerin
    if (b && (b.sichtbarkeit === "team" || b.besitzerId === person.id)) {
      bereichId = b.id;
      bereichName = b.name;
    }
  }

  const titel = betreffOhneTags(mail.betreff) || "Mail ohne Betreff";
  const haupt = await repo.eintragAnlegen({
    art: mail.anhaenge.length && !mail.text ? "datei" : "mail",
    quelle: "mail",
    titel,
    inhalt: mail.text,
    bereichId,
    erstelltVon: person.id,
    status: "verarbeitung",
    meta: { absender: mail.absender, zusatz: mail.zusatz, nachrichtId: mail.nachrichtId },
  });
  const tags = betreffTags(mail.betreff);
  if (tags.length) await repo.tagsErsetzen(haupt.id, "mail", tags.map((name) => ({ name })));

  const ids = [haupt.id];
  for (const a of mail.anhaenge) {
    const pfad = speicherPfad(person.id, a.name);
    await repo.dateiSpeichern(pfad, a.daten, a.typ);
    const audio = istAudio(a.typ, a.name);
    const kind = await repo.eintragAnlegen({
      art: audio ? "sprache" : "datei",
      quelle: "mail",
      titel: a.name,
      bereichId,
      elternId: haupt.id,
      erstelltVon: person.id,
      status: "verarbeitung",
      audioPfad: audio ? pfad : null,
      dateiPfad: audio ? null : pfad,
      dateiName: a.name,
      dateiTyp: a.typ,
      meta: { groesse: a.daten.byteLength },
    });
    if (tags.length) await repo.tagsErsetzen(kind.id, "mail", tags.map((name) => ({ name })));
    ids.push(kind.id);
  }
  return { ok: true, eintragIds: ids, bereich: bereichName };
}
