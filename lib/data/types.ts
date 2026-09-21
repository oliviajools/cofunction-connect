// Domänenmodell der CoFunction-Wissensplattform.
// Namen bewusst deutsch, damit Code, Datenbank und Oberfläche dieselbe Sprache sprechen.

export type BereichArt = "projekt" | "area" | "ressource" | "archiv";
export type Sichtbarkeit = "team" | "privat";
export type EintragArt =
  | "sprache"
  | "meeting"
  | "mail"
  | "datei"
  | "text"
  | "baustein"
  | "idee";
export type Quelle = "app" | "mail" | "upload";
export type EintragStatus =
  | "verarbeitung"
  | "bereit"
  | "fehler"
  | "ohne_transkription";
export type TagQuelle = "regel" | "manuell" | "mail";

export interface Profil {
  id: string;
  name: string;
  kuerzel: string;
  email: string;
  rolle: "admin" | "mitglied";
}

export interface Bereich {
  id: string;
  art: BereichArt;
  name: string;
  /** Kurzname für das Mail-Routing: wissen+<slug>@… */
  slug: string;
  beschreibung: string;
  sichtbarkeit: Sichtbarkeit;
  besitzerId: string;
  elternId: string | null;
  aktiv: boolean;
  erstelltAm: string;
}

export interface Segment {
  sprecher: string | null;
  start: number;
  ende: number;
  text: string;
}

export interface EintragTag {
  name: string;
  quelle: TagQuelle;
  regelWort: string | null;
}

export interface Eintrag {
  id: string;
  art: EintragArt;
  quelle: Quelle;
  titel: string;
  /** Markdown-Text. Bei Sprache/Meeting: das (editierbare) Transkript als Fließtext. */
  inhalt: string;
  /** null = Eingang (noch nicht zugeordnet) */
  bereichId: string | null;
  sichtbarkeit: Sichtbarkeit;
  erstelltVon: string;
  erstelltAm: string;
  aktualisiertAm: string;
  status: EintragStatus;
  fehler: string | null;
  transkript: Segment[] | null;
  audioPfad: string | null;
  dateiPfad: string | null;
  dateiName: string | null;
  dateiTyp: string | null;
  elternId: string | null;
  meta: Record<string, unknown>;
}

export interface EintragVoll extends Eintrag {
  tags: EintragTag[];
  ersteller: Pick<Profil, "id" | "name" | "kuerzel"> | null;
  bereich: Pick<Bereich, "id" | "name" | "slug" | "art"> | null;
}

export interface Regel {
  id: string;
  begriffe: string[];
  tag: string;
  aktiv: boolean;
}

export interface ProtokollPunkt {
  id: string;
  eintragId: string;
  typ: "entscheidung" | "offen";
  text: string;
  verantwortlich: string | null;
  erledigt: boolean;
  position: number;
}

export interface EintragFilter {
  /** undefined = alle, null = nur Eingang */
  bereichId?: string | null;
  arten?: EintragArt[];
  sichtbarkeit?: Sichtbarkeit;
  erstelltVon?: string;
  elternId?: string | null;
  status?: EintragStatus[];
  suche?: string;
  limit?: number;
}

export type NeuerEintrag = Pick<Eintrag, "art" | "titel"> &
  Partial<
    Pick<
      Eintrag,
      | "quelle"
      | "inhalt"
      | "bereichId"
      | "sichtbarkeit"
      | "status"
      | "transkript"
      | "audioPfad"
      | "dateiPfad"
      | "dateiName"
      | "dateiTyp"
      | "elternId"
      | "meta"
      | "erstelltVon"
    >
  >;

export type EintragPatch = Partial<
  Pick<
    Eintrag,
    | "titel"
    | "inhalt"
    | "sichtbarkeit"
    | "status"
    | "fehler"
    | "transkript"
    | "meta"
    | "dateiPfad"
    | "dateiName"
    | "dateiTyp"
  >
>;

export type NeuerBereich = Pick<Bereich, "art" | "name"> &
  Partial<Pick<Bereich, "slug" | "beschreibung" | "sichtbarkeit" | "elternId">>;

export type UploadZiel =
  | { art: "supabase"; pfad: string; token: string; signedUrl: string }
  | { art: "demo"; pfad: string; url: string };

export interface BereichZaehler {
  eintraege: number;
  meetings: number;
}

export interface BereichVerknuepfung {
  a: string;
  b: string;
}

export interface MindmapKnoten {
  id: string;
  name: string;
  art: BereichArt;
  sichtbarkeit: Sichtbarkeit;
}

export interface MindmapKante {
  von: string;
  nach: string;
  typ: "eltern" | "explizit";
}

export interface MindmapDaten {
  knoten: MindmapKnoten[];
  kanten: MindmapKante[];
}

/**
 * Zugriffsschicht. Zwei Implementierungen:
 * - DemoRepo: im Speicher, mit Beispieldaten (läuft ohne Konfiguration)
 * - SupabaseRepo: Postgres + Storage, Rechte über Row Level Security
 */
export interface Repo {
  readonly modus: "demo" | "supabase";
  nutzer(): Promise<Profil>;
  profile(): Promise<Profil[]>;

  bereiche(filter?: { art?: BereichArt; nurAktiv?: boolean }): Promise<Bereich[]>;
  bereich(id: string): Promise<Bereich | null>;
  bereichNachSlug(slug: string): Promise<Bereich | null>;
  bereichAnlegen(neu: NeuerBereich): Promise<Bereich>;
  bereichAktualisieren(
    id: string,
    patch: Partial<Pick<Bereich, "name" | "beschreibung" | "art" | "aktiv" | "sichtbarkeit">>,
  ): Promise<void>;
  bereichZaehler(): Promise<Record<string, BereichZaehler>>;

  eintraege(filter?: EintragFilter): Promise<EintragVoll[]>;
  eintrag(id: string): Promise<EintragVoll | null>;
  eintragAnlegen(neu: NeuerEintrag): Promise<Eintrag>;
  eintragAktualisieren(id: string, patch: EintragPatch): Promise<void>;
  eintragLoeschen(id: string): Promise<void>;
  /** Ordnet einen Eintrag zu (null = zurück in den Eingang) und protokolliert die Zuordnung. */
  zuordnen(eintragId: string, bereichId: string | null): Promise<void>;
  eingangAnzahl(): Promise<number>;

  /** Ersetzt alle Tags der angegebenen Quelle. */
  tagsErsetzen(eintragId: string, quelle: TagQuelle, tags: { name: string; regelWort?: string | null }[]): Promise<void>;
  tagHinzufuegen(eintragId: string, name: string, quelle?: TagQuelle): Promise<void>;
  tagEntfernen(eintragId: string, name: string): Promise<void>;

  regeln(): Promise<Regel[]>;
  regelAnlegen(begriffe: string[], tag: string): Promise<void>;
  regelAktualisieren(id: string, patch: Partial<Pick<Regel, "begriffe" | "tag" | "aktiv">>): Promise<void>;
  regelLoeschen(id: string): Promise<void>;

  protokoll(eintragId: string): Promise<ProtokollPunkt[]>;
  protokollPunktAnlegen(eintragId: string, typ: ProtokollPunkt["typ"], text: string, verantwortlich?: string | null): Promise<void>;
  protokollPunktAktualisieren(id: string, patch: Partial<Pick<ProtokollPunkt, "text" | "verantwortlich" | "erledigt">>): Promise<void>;
  protokollPunktLoeschen(id: string): Promise<void>;

  verknuepfungen(eintragId: string): Promise<EintragVoll[]>;
  verknuepfen(a: string, b: string): Promise<void>;
  entknuepfen(a: string, b: string): Promise<void>;

  bereichVerknuepfungen(bereichId?: string): Promise<BereichVerknuepfung[]>;
  bereichVerknuepfen(a: string, b: string): Promise<void>;
  bereichEntknuepfen(a: string, b: string): Promise<void>;
  mindmapDaten(): Promise<MindmapDaten>;

  uploadStarten(pfad: string): Promise<UploadZiel>;
  dateiSpeichern(pfad: string, daten: Uint8Array, typ: string): Promise<void>;
  dateiLesen(pfad: string): Promise<Uint8Array | null>;
  /** Kurzlebige URL zum Abspielen/Herunterladen (oder null, wenn nicht möglich). */
  dateiUrl(pfad: string, sekunden?: number): Promise<string | null>;
}
