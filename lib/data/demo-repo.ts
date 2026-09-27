// Demo-Implementierung: alles im Arbeitsspeicher des Servers.
// Daten gehen beim Neustart verloren – gedacht zum Ausprobieren und für Tests.

import { randomUUID } from "node:crypto";
import { slugAus, tagName, wendeRegelnAn } from "../regeln";
import { demoDaten, type DemoStore } from "./demo-seed";
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

const g = globalThis as unknown as { __cofunctionDemo?: DemoStore };

export function demoStore(): DemoStore {
  if (!g.__cofunctionDemo) {
    const s = demoDaten();
    // Tags der Beispieldaten deterministisch aus dem Regelwerk ableiten
    for (const e of s.eintraege) {
      for (const t of wendeRegelnAn(`${e.titel}\n${e.inhalt}`, s.regeln)) {
        s.tags.push({ eintragId: e.id, name: t.tag, quelle: "regel", regelWort: t.wort });
      }
    }
    g.__cofunctionDemo = s;
  }
  return g.__cofunctionDemo;
}

/** Nur für Tests: Speicher zurücksetzen. */
export function demoZuruecksetzen() {
  g.__cofunctionDemo = undefined;
}

export class DemoRepo implements Repo {
  readonly modus = "demo" as const;
  constructor(private nutzerId: string = "u-olivia") {}

  private get s() {
    return demoStore();
  }

  private sichtbar = (x: { sichtbarkeit: string; besitzerId?: string; erstelltVon?: string }) =>
    x.sichtbarkeit === "team" || x.besitzerId === this.nutzerId || x.erstelltVon === this.nutzerId;

  async nutzer(): Promise<Profil> {
    return this.s.profile.find((p) => p.id === this.nutzerId) ?? this.s.profile[0];
  }
  async profile() {
    return [...this.s.profile];
  }

  async bereiche(filter: { art?: BereichArt; nurAktiv?: boolean } = {}) {
    return this.s.bereiche
      .filter((b) => this.sichtbar(b))
      .filter((b) => !filter.art || b.art === filter.art)
      .filter((b) => !filter.nurAktiv || b.aktiv)
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }
  async bereich(id: string) {
    const b = this.s.bereiche.find((x) => x.id === id);
    return b && this.sichtbar(b) ? b : null;
  }
  async bereichNachSlug(slug: string) {
    const b = this.s.bereiche.find((x) => x.slug === slug);
    return b && this.sichtbar(b) ? b : null;
  }
  async bereichAnlegen(neu: NeuerBereich): Promise<Bereich> {
    let slug = neu.slug || slugAus(neu.name) || "bereich";
    const basis = slug;
    for (let i = 2; this.s.bereiche.some((b) => b.slug === slug); i++) slug = `${basis}-${i}`;
    const b: Bereich = {
      id: randomUUID(),
      art: neu.art,
      name: neu.name,
      slug,
      beschreibung: neu.beschreibung ?? "",
      sichtbarkeit: neu.sichtbarkeit ?? "team",
      besitzerId: this.nutzerId,
      elternId: neu.elternId ?? null,
      aktiv: true,
      erstelltAm: new Date().toISOString(),
    };
    this.s.bereiche.push(b);
    return b;
  }
  async bereichAktualisieren(id: string, patch: Partial<Bereich>) {
    const b = await this.bereich(id);
    if (b) Object.assign(b, patch);
  }
  async bereichZaehler() {
    const z: Record<string, { eintraege: number; meetings: number }> = {};
    for (const e of this.s.eintraege) {
      if (!e.bereichId || !this.sichtbar(e) || e.art === "idee") continue;
      z[e.bereichId] ??= { eintraege: 0, meetings: 0 };
      z[e.bereichId].eintraege++;
      if (e.art === "meeting") z[e.bereichId].meetings++;
    }
    return z;
  }

  private voll(e: Eintrag): EintragVoll {
    const p = this.s.profile.find((x) => x.id === e.erstelltVon);
    const b = e.bereichId ? this.s.bereiche.find((x) => x.id === e.bereichId) : null;
    return {
      ...e,
      tags: this.s.tags
        .filter((t) => t.eintragId === e.id)
        .map((t) => ({ name: t.name, quelle: t.quelle, regelWort: t.regelWort }))
        .sort((a, c) => a.name.localeCompare(c.name, "de")),
      ersteller: p ? { id: p.id, name: p.name, kuerzel: p.kuerzel } : null,
      bereich: b ? { id: b.id, name: b.name, slug: b.slug, art: b.art } : null,
    };
  }

  async eintraege(f: EintragFilter = {}) {
    const stamm = (w: string) => (w.length > 3 ? w.replace(/[esn]$/, "") : w);
    const worte = f.suche?.trim()
      ? f.suche
          .toLocaleLowerCase("de")
          .split(/\s+/)
          .filter((w) => w.length >= 2)
          .map(stamm)
      : null;
    const suchText = (e: Eintrag) => {
      const tagNamen = this.s.tags
        .filter((t) => t.eintragId === e.id)
        .map((t) => t.name)
        .join(" ");
      return `${e.titel} ${e.inhalt} ${e.dateiName ?? ""} ${tagNamen}`.toLocaleLowerCase("de");
    };
    const relevanz = (e: Eintrag) => {
      const text = suchText(e);
      const titel = e.titel.toLocaleLowerCase("de");
      let s = 0;
      for (const w of worte ?? []) {
        if (titel.includes(w)) s += 3;
        else if (text.includes(w)) s += 1;
      }
      return s;
    };
    return this.s.eintraege
      .filter((e) => this.sichtbar(e))
      .filter((e) => (f.bereichId === undefined ? true : e.bereichId === f.bereichId))
      .filter((e) => !f.arten || f.arten.includes(e.art))
      .filter((e) => !f.sichtbarkeit || e.sichtbarkeit === f.sichtbarkeit)
      .filter((e) => !f.erstelltVon || e.erstelltVon === f.erstelltVon)
      .filter((e) => (f.elternId === undefined ? true : e.elternId === f.elternId))
      .filter((e) => !f.status || f.status.includes(e.status))
      .filter((e) => {
        if (!worte) return true;
        const text = suchText(e);
        return worte.every((w) => text.includes(w));
      })
      .sort((a, b) => {
        if (worte) {
          const d = relevanz(b) - relevanz(a);
          if (d !== 0) return d;
        }
        return b.erstelltAm.localeCompare(a.erstelltAm);
      })
      .slice(0, f.limit ?? 500)
      .map((e) => this.voll(e));
  }
  async eintrag(id: string) {
    const e = this.s.eintraege.find((x) => x.id === id);
    return e && this.sichtbar(e) ? this.voll(e) : null;
  }
  async eintragAnlegen(neu: NeuerEintrag): Promise<Eintrag> {
    const jetzt = new Date().toISOString();
    const e: Eintrag = {
      id: randomUUID(),
      art: neu.art,
      quelle: neu.quelle ?? "app",
      titel: neu.titel,
      inhalt: neu.inhalt ?? "",
      bereichId: neu.bereichId ?? null,
      sichtbarkeit: neu.sichtbarkeit ?? "team",
      erstelltVon: neu.erstelltVon ?? this.nutzerId,
      erstelltAm: jetzt,
      aktualisiertAm: jetzt,
      status: neu.status ?? "bereit",
      fehler: null,
      transkript: neu.transkript ?? null,
      audioPfad: neu.audioPfad ?? null,
      dateiPfad: neu.dateiPfad ?? null,
      dateiName: neu.dateiName ?? null,
      dateiTyp: neu.dateiTyp ?? null,
      elternId: neu.elternId ?? null,
      meta: neu.meta ?? {},
    };
    this.s.eintraege.push(e);
    return e;
  }
  async eintragAktualisieren(id: string, patch: EintragPatch) {
    const e = this.s.eintraege.find((x) => x.id === id);
    if (!e || !this.sichtbar(e)) return;
    Object.assign(e, patch, { aktualisiertAm: new Date().toISOString() });
  }
  async eintragLoeschen(id: string) {
    const ids = new Set([id, ...this.s.eintraege.filter((e) => e.elternId === id).map((e) => e.id)]);
    this.s.eintraege = this.s.eintraege.filter((e) => !ids.has(e.id));
    this.s.tags = this.s.tags.filter((t) => !ids.has(t.eintragId));
    this.s.protokoll = this.s.protokoll.filter((p) => !ids.has(p.eintragId));
    this.s.verknuepfungen = this.s.verknuepfungen.filter((v) => !ids.has(v.a) && !ids.has(v.b));
  }
  async zuordnen(eintragId: string, bereichId: string | null) {
    const e = this.s.eintraege.find((x) => x.id === eintragId);
    if (!e) return;
    this.s.zuordnungen.push({ eintragId, von: e.bereichId, nach: bereichId, nutzer: this.nutzerId, am: new Date().toISOString() });
    e.bereichId = bereichId;
    // Kinder (z. B. Anhänge einer Mail, Bausteine eines Meetings) wandern mit
    for (const k of this.s.eintraege) if (k.elternId === eintragId) k.bereichId = bereichId;
  }
  async eingangAnzahl() {
    return this.s.eintraege.filter((e) => e.bereichId === null && e.elternId === null && this.sichtbar(e)).length;
  }

  async tagsErsetzen(eintragId: string, quelle: TagQuelle, tags: { name: string; regelWort?: string | null }[]) {
    this.s.tags = this.s.tags.filter((t) => !(t.eintragId === eintragId && t.quelle === quelle));
    for (const t of tags) {
      const name = tagName(t.name);
      if (!name || this.s.tags.some((x) => x.eintragId === eintragId && x.name === name)) continue;
      this.s.tags.push({ eintragId, name, quelle, regelWort: t.regelWort ?? null });
    }
  }
  async tagHinzufuegen(eintragId: string, roh: string, quelle: TagQuelle = "manuell") {
    const name = tagName(roh);
    if (!name || this.s.tags.some((t) => t.eintragId === eintragId && t.name === name)) return;
    this.s.tags.push({ eintragId, name, quelle, regelWort: null });
  }
  async tagEntfernen(eintragId: string, name: string) {
    this.s.tags = this.s.tags.filter((t) => !(t.eintragId === eintragId && t.name === name));
  }

  async regeln() {
    return [...this.s.regeln].sort((a, b) => a.tag.localeCompare(b.tag, "de"));
  }
  async regelAnlegen(begriffe: string[], tag: string) {
    this.s.regeln.push({ id: randomUUID(), begriffe, tag: tagName(tag), aktiv: true });
  }
  async regelAktualisieren(id: string, patch: Partial<Regel>) {
    const r = this.s.regeln.find((x) => x.id === id);
    if (r) Object.assign(r, patch, patch.tag ? { tag: tagName(patch.tag) } : {});
  }
  async regelLoeschen(id: string) {
    this.s.regeln = this.s.regeln.filter((r) => r.id !== id);
  }

  async protokoll(eintragId: string) {
    return this.s.protokoll.filter((p) => p.eintragId === eintragId).sort((a, b) => a.position - b.position);
  }
  async protokollPunktAnlegen(eintragId: string, typ: ProtokollPunkt["typ"], text: string, verantwortlich: string | null = null) {
    const pos = Math.max(0, ...this.s.protokoll.filter((p) => p.eintragId === eintragId).map((p) => p.position)) + 1;
    this.s.protokoll.push({ id: randomUUID(), eintragId, typ, text, verantwortlich, erledigt: false, position: pos });
  }
  async protokollPunktAktualisieren(id: string, patch: Partial<ProtokollPunkt>) {
    const p = this.s.protokoll.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
  }
  async protokollPunktLoeschen(id: string) {
    this.s.protokoll = this.s.protokoll.filter((p) => p.id !== id);
  }

  async verknuepfungen(eintragId: string) {
    const ids = this.s.verknuepfungen
      .filter((v) => v.a === eintragId || v.b === eintragId)
      .map((v) => (v.a === eintragId ? v.b : v.a));
    return this.s.eintraege.filter((e) => ids.includes(e.id) && this.sichtbar(e)).map((e) => this.voll(e));
  }
  async verknuepfen(a: string, b: string) {
    if (a === b || this.s.verknuepfungen.some((v) => (v.a === a && v.b === b) || (v.a === b && v.b === a))) return;
    this.s.verknuepfungen.push({ a, b });
  }
  async entknuepfen(a: string, b: string) {
    this.s.verknuepfungen = this.s.verknuepfungen.filter((v) => !((v.a === a && v.b === b) || (v.a === b && v.b === a)));
  }

  async bereichVerknuepfungen(bereichId?: string) {
    const v = this.s.bereichVerknuepfungen.filter((x) => !bereichId || x.a === bereichId || x.b === bereichId);
    return v.map((x) => ({ a: x.a, b: x.b } as BereichVerknuepfung));
  }
  async bereichVerknuepfen(a: string, b: string) {
    if (a === b || this.s.bereichVerknuepfungen.some((v) => (v.a === a && v.b === b) || (v.a === b && v.b === a))) return;
    this.s.bereichVerknuepfungen.push({ a, b });
  }
  async bereichEntknuepfen(a: string, b: string) {
    this.s.bereichVerknuepfungen = this.s.bereichVerknuepfungen.filter((v) => !((v.a === a && v.b === b) || (v.a === b && v.b === a)));
  }

  async mindmapDaten(): Promise<MindmapDaten> {
    const knoten = this.s.bereiche.filter((b) => this.sichtbar(b)).map((b) => ({
      id: b.id,
      name: b.name,
      art: b.art,
      sichtbarkeit: b.sichtbarkeit,
    }));
    const ids = new Set(knoten.map((k) => k.id));
    const kanten: MindmapDaten["kanten"] = [];
    for (const b of this.s.bereiche) {
      if (b.elternId && ids.has(b.elternId) && ids.has(b.id)) {
        kanten.push({ von: b.elternId, nach: b.id, typ: "eltern" });
      }
    }
    for (const v of this.s.bereichVerknuepfungen) {
      if (ids.has(v.a) && ids.has(v.b)) {
        kanten.push({ von: v.a, nach: v.b, typ: "explizit" });
      }
    }
    return { knoten, kanten };
  }

  async uploadStarten(pfad: string): Promise<UploadZiel> {
    return { art: "demo", pfad, url: `/api/demo/upload?pfad=${encodeURIComponent(pfad)}` };
  }
  async dateiSpeichern(pfad: string, daten: Uint8Array, typ: string) {
    this.s.dateien.set(pfad, { daten, typ });
  }
  async dateiLesen(pfad: string) {
    return this.s.dateien.get(pfad)?.daten ?? null;
  }
  async dateiUrl(pfad: string) {
    return this.s.dateien.has(pfad) ? `/api/demo/datei?pfad=${encodeURIComponent(pfad)}` : null;
  }
}
