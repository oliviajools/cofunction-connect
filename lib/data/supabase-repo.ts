// Supabase-Implementierung. Rechte werden in der Datenbank über Row Level Security
// durchgesetzt (siehe supabase/migrations). Dieser Code übersetzt nur zwischen
// Datenbankspalten (snake_case) und dem Domänenmodell.

import type { SupabaseClient } from "@supabase/supabase-js";
import { SPEICHER_BUCKET } from "../config";
import { slugAus, tagName } from "../regeln";
import type {
  Bereich,
  BereichArt,
  BereichVerknuepfung,
  Eintrag,
  EintragFilter,
  EintragPatch,
  EintragVoll,
  MindmapDaten,
  NeuerBereich,
  NeuerEintrag,
  Profil,
  ProtokollPunkt,
  Regel,
  Repo,
  TagQuelle,
  UploadZiel,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Zeile = Record<string, any>;

const EINTRAG_SELECT = `*,
  eintrag_tags(quelle, regel_wort, tags(name)),
  ersteller:profile!eintraege_erstellt_von_fkey(id, name, kuerzel),
  bereich:bereiche!eintraege_bereich_id_fkey(id, name, slug, art)`;

function pruefe<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const zuProfil = (z: Zeile): Profil => ({ id: z.id, name: z.name, kuerzel: z.kuerzel, email: z.email, rolle: z.rolle });

const zuBereich = (z: Zeile): Bereich => ({
  id: z.id,
  art: z.art,
  name: z.name,
  slug: z.slug,
  beschreibung: z.beschreibung ?? "",
  sichtbarkeit: z.sichtbarkeit,
  besitzerId: z.besitzer_id,
  elternId: z.eltern_id,
  aktiv: z.aktiv,
  erstelltAm: z.erstellt_am,
});

const zuEintrag = (z: Zeile): Eintrag => ({
  id: z.id,
  art: z.art,
  quelle: z.quelle,
  titel: z.titel,
  inhalt: z.inhalt ?? "",
  bereichId: z.bereich_id,
  sichtbarkeit: z.sichtbarkeit,
  erstelltVon: z.erstellt_von,
  erstelltAm: z.erstellt_am,
  aktualisiertAm: z.aktualisiert_am,
  status: z.status,
  fehler: z.fehler,
  transkript: z.transkript,
  audioPfad: z.audio_pfad,
  dateiPfad: z.datei_pfad,
  dateiName: z.datei_name,
  dateiTyp: z.datei_typ,
  elternId: z.eltern_id,
  meta: z.meta ?? {},
});

const zuEintragVoll = (z: Zeile): EintragVoll => ({
  ...zuEintrag(z),
  tags: ((z.eintrag_tags ?? []) as Zeile[])
    .map((t) => ({ name: t.tags?.name as string, quelle: t.quelle as TagQuelle, regelWort: t.regel_wort ?? null }))
    .filter((t) => t.name)
    .sort((a, b) => a.name.localeCompare(b.name, "de")),
  ersteller: z.ersteller ?? null,
  bereich: z.bereich ?? null,
});

export class SupabaseRepo implements Repo {
  readonly modus = "supabase" as const;

  /**
   * @param db Supabase-Client (mit Nutzer-Session = RLS greift; mit geheimem Schlüssel = Systemzugriff)
   * @param nutzerId die handelnde Person
   */
  constructor(
    private db: SupabaseClient,
    private nutzerId: string,
  ) {}

  async nutzer(): Promise<Profil> {
    const z = pruefe(await this.db.from("profile").select("*").eq("id", this.nutzerId).single());
    return zuProfil(z);
  }
  async profile() {
    return (pruefe(await this.db.from("profile").select("*").order("name")) as Zeile[]).map(zuProfil);
  }

  async bereiche(filter: { art?: BereichArt; nurAktiv?: boolean } = {}) {
    let q = this.db.from("bereiche").select("*").order("name");
    if (filter.art) q = q.eq("art", filter.art);
    if (filter.nurAktiv) q = q.eq("aktiv", true);
    return (pruefe(await q) as Zeile[]).map(zuBereich);
  }
  async bereich(id: string) {
    const z = pruefe(await this.db.from("bereiche").select("*").eq("id", id).maybeSingle());
    return z ? zuBereich(z) : null;
  }
  async bereichNachSlug(slug: string) {
    const z = pruefe(await this.db.from("bereiche").select("*").eq("slug", slug).maybeSingle());
    return z ? zuBereich(z) : null;
  }
  async bereichAnlegen(neu: NeuerBereich): Promise<Bereich> {
    const basis = neu.slug || slugAus(neu.name) || "bereich";
    const vorhanden = (pruefe(await this.db.from("bereiche").select("slug").like("slug", `${basis}%`)) as Zeile[]).map((z) => z.slug);
    let slug = basis;
    for (let i = 2; vorhanden.includes(slug); i++) slug = `${basis}-${i}`;
    const z = pruefe(
      await this.db
        .from("bereiche")
        .insert({
          art: neu.art,
          name: neu.name,
          slug,
          beschreibung: neu.beschreibung ?? "",
          sichtbarkeit: neu.sichtbarkeit ?? "team",
          eltern_id: neu.elternId ?? null,
          besitzer_id: this.nutzerId,
        })
        .select("*")
        .single(),
    );
    return zuBereich(z);
  }
  async bereichAktualisieren(id: string, patch: Partial<Bereich>) {
    const zeile: Zeile = {};
    if (patch.name !== undefined) zeile.name = patch.name;
    if (patch.beschreibung !== undefined) zeile.beschreibung = patch.beschreibung;
    if (patch.art !== undefined) zeile.art = patch.art;
    if (patch.aktiv !== undefined) zeile.aktiv = patch.aktiv;
    if (patch.sichtbarkeit !== undefined) zeile.sichtbarkeit = patch.sichtbarkeit;
    pruefe(await this.db.from("bereiche").update(zeile).eq("id", id));
  }
  async bereichZaehler() {
    const zeilen = pruefe(
      await this.db.from("eintraege").select("bereich_id, art").not("bereich_id", "is", null).neq("art", "idee").limit(10000),
    ) as Zeile[];
    const z: Record<string, { eintraege: number; meetings: number }> = {};
    for (const r of zeilen) {
      z[r.bereich_id] ??= { eintraege: 0, meetings: 0 };
      z[r.bereich_id].eintraege++;
      if (r.art === "meeting") z[r.bereich_id].meetings++;
    }
    return z;
  }

  async eintraege(f: EintragFilter = {}) {
    let q = this.db.from("eintraege").select(EINTRAG_SELECT).order("erstellt_am", { ascending: false }).limit(f.limit ?? 500);
    if (f.bereichId === null) q = q.is("bereich_id", null);
    else if (f.bereichId) q = q.eq("bereich_id", f.bereichId);
    if (f.arten) q = q.in("art", f.arten);
    if (f.sichtbarkeit) q = q.eq("sichtbarkeit", f.sichtbarkeit);
    if (f.erstelltVon) q = q.eq("erstellt_von", f.erstelltVon);
    if (f.elternId === null) q = q.is("eltern_id", null);
    else if (f.elternId) q = q.eq("eltern_id", f.elternId);
    if (f.status) q = q.in("status", f.status);
    if (f.suche?.trim()) q = q.textSearch("suchtext", f.suche.trim(), { type: "websearch", config: "german" });
    return (pruefe(await q) as Zeile[]).map(zuEintragVoll);
  }
  async eintrag(id: string) {
    const z = pruefe(await this.db.from("eintraege").select(EINTRAG_SELECT).eq("id", id).maybeSingle());
    return z ? zuEintragVoll(z) : null;
  }
  async eintragAnlegen(neu: NeuerEintrag): Promise<Eintrag> {
    const z = pruefe(
      await this.db
        .from("eintraege")
        .insert({
          art: neu.art,
          quelle: neu.quelle ?? "app",
          titel: neu.titel,
          inhalt: neu.inhalt ?? "",
          bereich_id: neu.bereichId ?? null,
          sichtbarkeit: neu.sichtbarkeit ?? "team",
          status: neu.status ?? "bereit",
          transkript: neu.transkript ?? null,
          audio_pfad: neu.audioPfad ?? null,
          datei_pfad: neu.dateiPfad ?? null,
          datei_name: neu.dateiName ?? null,
          datei_typ: neu.dateiTyp ?? null,
          eltern_id: neu.elternId ?? null,
          meta: neu.meta ?? {},
          erstellt_von: neu.erstelltVon ?? this.nutzerId,
        })
        .select("*")
        .single(),
    );
    return zuEintrag(z);
  }
  async eintragAktualisieren(id: string, patch: EintragPatch) {
    const zeile: Zeile = {};
    if (patch.titel !== undefined) zeile.titel = patch.titel;
    if (patch.inhalt !== undefined) zeile.inhalt = patch.inhalt;
    if (patch.sichtbarkeit !== undefined) zeile.sichtbarkeit = patch.sichtbarkeit;
    if (patch.status !== undefined) zeile.status = patch.status;
    if (patch.fehler !== undefined) zeile.fehler = patch.fehler;
    if (patch.transkript !== undefined) zeile.transkript = patch.transkript;
    if (patch.meta !== undefined) zeile.meta = patch.meta;
    if (patch.dateiPfad !== undefined) zeile.datei_pfad = patch.dateiPfad;
    if (patch.dateiName !== undefined) zeile.datei_name = patch.dateiName;
    if (patch.dateiTyp !== undefined) zeile.datei_typ = patch.dateiTyp;
    pruefe(await this.db.from("eintraege").update(zeile).eq("id", id));
  }
  async eintragLoeschen(id: string) {
    const e = await this.eintrag(id);
    const pfade = [e?.audioPfad, e?.dateiPfad].filter(Boolean) as string[];
    const kinder = pruefe(await this.db.from("eintraege").select("audio_pfad, datei_pfad").eq("eltern_id", id)) as Zeile[];
    for (const k of kinder) for (const p of [k.audio_pfad, k.datei_pfad]) if (p) pfade.push(p);
    pruefe(await this.db.from("eintraege").delete().eq("id", id));
    if (pfade.length) await this.db.storage.from(SPEICHER_BUCKET).remove(pfade);
  }
  async zuordnen(eintragId: string, bereichId: string | null) {
    const e = pruefe(await this.db.from("eintraege").select("bereich_id").eq("id", eintragId).single()) as Zeile;
    pruefe(await this.db.from("eintraege").update({ bereich_id: bereichId }).or(`id.eq.${eintragId},eltern_id.eq.${eintragId}`));
    pruefe(
      await this.db.from("zuordnungen").insert({
        eintrag_id: eintragId,
        von_bereich_id: e.bereich_id,
        nach_bereich_id: bereichId,
        von_nutzer: this.nutzerId,
      }),
    );
  }
  async eingangAnzahl() {
    const res = await this.db.from("eintraege").select("id", { count: "exact", head: true }).is("bereich_id", null).is("eltern_id", null);
    if (res.error) throw new Error(res.error.message);
    return res.count ?? 0;
  }

  private async tagId(roh: string): Promise<string | null> {
    const name = tagName(roh);
    if (!name) return null;
    const z = pruefe(await this.db.from("tags").upsert({ name }, { onConflict: "name" }).select("id").single()) as Zeile;
    return z.id;
  }
  async tagsErsetzen(eintragId: string, quelle: TagQuelle, tags: { name: string; regelWort?: string | null }[]) {
    pruefe(await this.db.from("eintrag_tags").delete().eq("eintrag_id", eintragId).eq("quelle", quelle));
    const bestehend = (pruefe(await this.db.from("eintrag_tags").select("tag_id").eq("eintrag_id", eintragId)) as Zeile[]).map((z) => z.tag_id);
    const zeilen: Zeile[] = [];
    for (const t of tags) {
      const id = await this.tagId(t.name);
      if (!id || bestehend.includes(id) || zeilen.some((z) => z.tag_id === id)) continue;
      zeilen.push({ eintrag_id: eintragId, tag_id: id, quelle, regel_wort: t.regelWort ?? null });
    }
    if (zeilen.length) pruefe(await this.db.from("eintrag_tags").insert(zeilen));
  }
  async tagHinzufuegen(eintragId: string, name: string, quelle: TagQuelle = "manuell") {
    const id = await this.tagId(name);
    if (!id) return;
    pruefe(
      await this.db
        .from("eintrag_tags")
        .upsert({ eintrag_id: eintragId, tag_id: id, quelle, regel_wort: null }, { onConflict: "eintrag_id,tag_id", ignoreDuplicates: true }),
    );
  }
  async tagEntfernen(eintragId: string, name: string) {
    const t = pruefe(await this.db.from("tags").select("id").eq("name", name).maybeSingle()) as Zeile | null;
    if (t) pruefe(await this.db.from("eintrag_tags").delete().eq("eintrag_id", eintragId).eq("tag_id", t.id));
  }

  async regeln(): Promise<Regel[]> {
    const zeilen = pruefe(await this.db.from("regeln").select("id, begriffe, aktiv, tags(name)")) as Zeile[];
    return zeilen
      .map((z) => ({ id: z.id, begriffe: z.begriffe ?? [], tag: z.tags?.name ?? "", aktiv: z.aktiv }))
      .sort((a, b) => a.tag.localeCompare(b.tag, "de"));
  }
  async regelAnlegen(begriffe: string[], tag: string) {
    const id = await this.tagId(tag);
    if (!id) throw new Error("Ungültiger Tag");
    pruefe(await this.db.from("regeln").insert({ begriffe, tag_id: id }));
  }
  async regelAktualisieren(id: string, patch: Partial<Regel>) {
    const zeile: Zeile = {};
    if (patch.begriffe) zeile.begriffe = patch.begriffe;
    if (patch.aktiv !== undefined) zeile.aktiv = patch.aktiv;
    if (patch.tag) zeile.tag_id = await this.tagId(patch.tag);
    pruefe(await this.db.from("regeln").update(zeile).eq("id", id));
  }
  async regelLoeschen(id: string) {
    pruefe(await this.db.from("regeln").delete().eq("id", id));
  }

  async protokoll(eintragId: string): Promise<ProtokollPunkt[]> {
    const zeilen = pruefe(await this.db.from("protokoll_punkte").select("*").eq("eintrag_id", eintragId).order("position")) as Zeile[];
    return zeilen.map((z) => ({
      id: z.id,
      eintragId: z.eintrag_id,
      typ: z.typ,
      text: z.text,
      verantwortlich: z.verantwortlich,
      erledigt: z.erledigt,
      position: z.position,
    }));
  }
  async protokollPunktAnlegen(eintragId: string, typ: ProtokollPunkt["typ"], text: string, verantwortlich: string | null = null) {
    const letzte = pruefe(
      await this.db.from("protokoll_punkte").select("position").eq("eintrag_id", eintragId).order("position", { ascending: false }).limit(1),
    ) as Zeile[];
    pruefe(
      await this.db
        .from("protokoll_punkte")
        .insert({ eintrag_id: eintragId, typ, text, verantwortlich, position: (letzte[0]?.position ?? 0) + 1 }),
    );
  }
  async protokollPunktAktualisieren(id: string, patch: Partial<ProtokollPunkt>) {
    const zeile: Zeile = {};
    if (patch.text !== undefined) zeile.text = patch.text;
    if (patch.verantwortlich !== undefined) zeile.verantwortlich = patch.verantwortlich;
    if (patch.erledigt !== undefined) zeile.erledigt = patch.erledigt;
    pruefe(await this.db.from("protokoll_punkte").update(zeile).eq("id", id));
  }
  async protokollPunktLoeschen(id: string) {
    pruefe(await this.db.from("protokoll_punkte").delete().eq("id", id));
  }

  async verknuepfungen(eintragId: string) {
    const zeilen = pruefe(
      await this.db.from("verknuepfungen").select("von_id, nach_id").or(`von_id.eq.${eintragId},nach_id.eq.${eintragId}`),
    ) as Zeile[];
    const ids = zeilen.map((z) => (z.von_id === eintragId ? z.nach_id : z.von_id));
    if (!ids.length) return [];
    return (pruefe(await this.db.from("eintraege").select(EINTRAG_SELECT).in("id", ids)) as Zeile[]).map(zuEintragVoll);
  }
  async verknuepfen(a: string, b: string) {
    if (a === b) return;
    const [von, nach] = a < b ? [a, b] : [b, a];
    pruefe(await this.db.from("verknuepfungen").upsert({ von_id: von, nach_id: nach }, { onConflict: "von_id,nach_id", ignoreDuplicates: true }));
  }
  async entknuepfen(a: string, b: string) {
    const [von, nach] = a < b ? [a, b] : [b, a];
    pruefe(await this.db.from("verknuepfungen").delete().eq("von_id", von).eq("nach_id", nach));
  }

  async bereichVerknuepfungen(bereichId?: string) {
    let q = this.db.from("bereich_verknuepfungen").select("von_id, nach_id");
    if (bereichId) q = q.or(`von_id.eq.${bereichId},nach_id.eq.${bereichId}`);
    const zeilen = pruefe(await q) as Zeile[];
    return zeilen.map((z) => ({ a: z.von_id, b: z.nach_id }) as BereichVerknuepfung);
  }
  async bereichVerknuepfen(a: string, b: string) {
    if (a === b) return;
    const [von, nach] = a < b ? [a, b] : [b, a];
    pruefe(await this.db.from("bereich_verknuepfungen").upsert({ von_id: von, nach_id: nach }, { onConflict: "von_id,nach_id", ignoreDuplicates: true }));
  }
  async bereichEntknuepfen(a: string, b: string) {
    const [von, nach] = a < b ? [a, b] : [b, a];
    pruefe(await this.db.from("bereich_verknuepfungen").delete().eq("von_id", von).eq("nach_id", nach));
  }

  async mindmapDaten(): Promise<MindmapDaten> {
    const bereiche = (pruefe(await this.db.from("bereiche").select("id, name, art, sichtbarkeit, eltern_id")) as Zeile[]).map((z) => ({
      id: z.id,
      name: z.name,
      art: z.art,
      sichtbarkeit: z.sichtbarkeit,
      elternId: z.eltern_id,
    }));
    const ids = new Set(bereiche.map((b) => b.id));
    const verknuepfungen = pruefe(await this.db.from("bereich_verknuepfungen").select("von_id, nach_id")) as Zeile[];
    const kanten: MindmapDaten["kanten"] = [];
    for (const b of bereiche) {
      if (b.elternId && ids.has(b.elternId)) {
        kanten.push({ von: b.elternId, nach: b.id, typ: "eltern" });
      }
    }
    for (const v of verknuepfungen) {
      if (ids.has(v.von_id) && ids.has(v.nach_id)) {
        kanten.push({ von: v.von_id, nach: v.nach_id, typ: "explizit" });
      }
    }
    return {
      knoten: bereiche.map((b) => ({ id: b.id, name: b.name, art: b.art, sichtbarkeit: b.sichtbarkeit })),
      kanten,
    };
  }

  async uploadStarten(pfad: string): Promise<UploadZiel> {
    const d = pruefe(await this.db.storage.from(SPEICHER_BUCKET).createSignedUploadUrl(pfad)) as {
      signedUrl: string;
      token: string;
      path: string;
    };
    return { art: "supabase", pfad: d.path, token: d.token, signedUrl: d.signedUrl };
  }
  async dateiSpeichern(pfad: string, daten: Uint8Array, typ: string) {
    const res = await this.db.storage.from(SPEICHER_BUCKET).upload(pfad, daten, { contentType: typ, upsert: false });
    if (res.error) throw new Error(res.error.message);
  }
  async dateiLesen(pfad: string) {
    const res = await this.db.storage.from(SPEICHER_BUCKET).download(pfad);
    if (res.error || !res.data) return null;
    return new Uint8Array(await res.data.arrayBuffer());
  }
  async dateiUrl(pfad: string, sekunden = 3600) {
    const res = await this.db.storage.from(SPEICHER_BUCKET).createSignedUrl(pfad, sekunden);
    return res.error ? null : res.data.signedUrl;
  }
}
