// Beispieldaten für den Demo-Modus. Alle Inhalte sind erfunden und dienen nur zum Ausprobieren.

import type { Bereich, Eintrag, Profil, ProtokollPunkt, Regel, TagQuelle } from "./types";

export interface DemoStore {
  profile: Profil[];
  bereiche: Bereich[];
  eintraege: Eintrag[];
  tags: { eintragId: string; name: string; quelle: TagQuelle; regelWort: string | null }[];
  regeln: Regel[];
  protokoll: ProtokollPunkt[];
  verknuepfungen: { a: string; b: string }[];
  bereichVerknuepfungen: { a: string; b: string }[];
  zuordnungen: { eintragId: string; von: string | null; nach: string | null; nutzer: string; am: string }[];
  dateien: Map<string, { daten: Uint8Array; typ: string }>;
}

function vor(minuten: number): string {
  return new Date(Date.now() - minuten * 60_000).toISOString();
}

export function demoDaten(): DemoStore {
  const OLIVIA = "u-olivia";
  const RALPH = "u-ralph";

  const profile: Profil[] = [
    { id: OLIVIA, name: "Olivia B.", kuerzel: "OB", email: "olivia@example.org", rolle: "admin" },
    { id: RALPH, name: "Ralph K.", kuerzel: "RK", email: "ralph@example.org", rolle: "mitglied" },
  ];

  const b = (
    id: string,
    art: Bereich["art"],
    name: string,
    slug: string,
    beschreibung = "",
    extra: Partial<Bereich> = {},
  ): Bereich => ({
    id,
    art,
    name,
    slug,
    beschreibung,
    sichtbarkeit: "team",
    besitzerId: OLIVIA,
    elternId: null,
    aktiv: true,
    erstelltAm: vor(60 * 24 * 30),
    ...extra,
  });

  const bereiche: Bereich[] = [
    b("a-sport", "area", "Performance Sports", "performance-sports", "Aktivierung aller Funktionen für den Leistungssport."),
    b("a-kinder", "area", "Potenziale von Kindern", "kinder", "Potenziale erkennen und entfalten."),
    b("a-behandlung", "area", "Individuelle Behandlung", "behandlung", "Sprechstunde und therapeutische Behandlung – nur Wissen, keine Patientendaten."),
    b("a-meducation", "area", "Meducation", "meducation", "Fortbildungen, Vorträge, Ausbildung."),
    b("a-strategie", "area", "Strategieberatung", "strategie", "Konzepte für Vereine und Verbände."),
    b("p-hockey", "projekt", "Leistungsstützpunkt Hockey", "hockey", "Eingangsdiagnostik und Belastungssteuerung für den Stützpunkt.", { elternId: "a-sport" }),
    b("p-ausbildung", "projekt", "Ausbildung Oktober", "ausbildung", "Vorbereitung der CoFunction-Ausbildung.", { elternId: "a-meducation" }),
    b("p-vortrag", "projekt", "Vortragsreihe Trainer:innen", "vortrag", "Kurze Briefings für Trainerteams.", { elternId: "a-meducation" }),
    b("p-plattform", "projekt", "Aufbau Wissensplattform", "plattform", "Persönliche Notizen zum Aufbau.", { sichtbarkeit: "privat" }),
    b("r-studien", "ressource", "Studien", "studie", "Gesammelte Fachliteratur."),
    b("r-folien", "ressource", "Folien & Vorlagen", "folien", "Vortragsfolien und Vorlagen."),
    b("x-archiv", "archiv", "Archiv", "archiv", "Abgeschlossenes und Ideen ohne aktuellen Platz."),
  ];

  const e = (id: string, felder: Partial<Eintrag> & Pick<Eintrag, "art" | "titel">): Eintrag => ({
    id,
    quelle: "app",
    inhalt: "",
    bereichId: null,
    sichtbarkeit: "team",
    erstelltVon: OLIVIA,
    erstelltAm: vor(60),
    aktualisiertAm: vor(60),
    status: "bereit",
    fehler: null,
    transkript: null,
    audioPfad: null,
    dateiPfad: null,
    dateiName: null,
    dateiTyp: null,
    elternId: null,
    meta: {},
    ...felder,
  });

  const meetingSegmente = [
    { sprecher: "Ralph K.", start: 134, ende: 150, text: "Wir sollten die Eingangsdiagnostik für alle Spielerinnen gleich aufbauen, damit wir später überhaupt vergleichen können." },
    { sprecher: "Olivia B.", start: 151, ende: 184, text: "Dann brauchen wir ein festes Protokoll – welche Tests, in welcher Reihenfolge, unter welchen Bedingungen." },
    { sprecher: "Ralph K.", start: 185, ende: 219, text: "Genau. Und das Trainerteam muss verstehen, warum wir das machen, sonst wird es nicht umgesetzt." },
    { sprecher: "Olivia B.", start: 220, ende: 251, text: "Das wäre ein Thema für ein kurzes Briefing vor dem Training." },
    { sprecher: "Ralph K.", start: 252, ende: 289, text: "Zweiter Punkt ist die Belastungssteuerung. Da hängen wir im Moment noch an Einzelfällen." },
    { sprecher: "Olivia B.", start: 290, ende: 320, text: "Dann sammeln wir erstmal Beispiele und schauen, was sich wiederholt." },
  ];

  const eintraege: Eintrag[] = [
    // Eingang
    e("e-sprung", {
      art: "sprache",
      titel: "Beobachtung Sprungserie U16",
      inhalt:
        "Bei den U16-Spielerinnen nach der Sprungserie deutlich mehr Ausweichbewegung im Knie links. Beim Hockey-Kaderlehrgang nochmal gezielt anschauen, ob das mit Ermüdung zusammenhängt.",
      erstelltVon: RALPH,
      erstelltAm: vor(35),
      meta: { dauer: 48 },
    }),
    e("e-studie", {
      art: "mail",
      quelle: "mail",
      titel: "Studie: Propriozeptives Training im Jugendalter",
      inhalt: "Weitergeleitete Mail mit Studie im Anhang. Bitte bei Gelegenheit sichten.",
      erstelltAm: vor(60 * 20),
      meta: { absender: "olivia@example.org" },
    }),
    e("e-folien", {
      art: "datei",
      quelle: "upload",
      titel: "Folien: Nervensystem & Belastung (Entwurf)",
      inhalt: "Nervensystem und Belastung – Wie das Gehirn Ermüdung wahrnimmt. Entwurf für die Vortragsreihe.",
      dateiName: "nervensystem-belastung.pdf",
      dateiTyp: "application/pdf",
      erstelltAm: vor(60 * 26),
    }),
    // Hockey
    e("e-kickoff", {
      art: "meeting",
      titel: "Kick-off Leistungsstützpunkt Hockey",
      bereichId: "p-hockey",
      inhalt: meetingSegmente.map((s) => `${s.sprecher}: ${s.text}`).join("\n\n"),
      transkript: meetingSegmente,
      erstelltAm: vor(60 * 18),
      meta: { dauer: 2530 },
    }),
    e("e-baustein-diagnostik", {
      art: "baustein",
      titel: "Diagnostik nur vergleichbar, wenn das Protokoll identisch ist",
      bereichId: "p-hockey",
      inhalt: "Eingangsdiagnostik für alle Spielerinnen gleich aufbauen: gleiche Tests, gleiche Reihenfolge, gleiche Bedingungen.",
      elternId: "e-kickoff",
      erstelltAm: vor(60 * 17),
      meta: { von: 134, bis: 184 },
    }),
    e("e-trainerteam", {
      art: "sprache",
      titel: "Rückmeldung Trainerteam zur Belastungswoche",
      bereichId: "p-hockey",
      inhalt: "Das Trainerteam wünscht sich eine einfache Rückmeldung, wer in der Woche reduziert trainieren sollte.",
      erstelltVon: RALPH,
      erstelltAm: vor(60 * 50),
      meta: { dauer: 72 },
    }),
    e("e-termine", {
      art: "mail",
      quelle: "mail",
      titel: "Terminvorschläge Kaderlehrgang",
      bereichId: "p-hockey",
      inhalt: "Weitergeleitete Mail, über die Adresse direkt diesem Projekt zugeordnet.",
      erstelltAm: vor(60 * 70),
    }),
    e("e-testbatterie", {
      art: "datei",
      quelle: "upload",
      titel: "Testbatterie Entwurf v2",
      bereichId: "p-hockey",
      inhalt: "Übersicht möglicher Tests für die Eingangsdiagnostik, noch nicht abgestimmt.",
      dateiName: "testbatterie-v2.pdf",
      dateiTyp: "application/pdf",
      erstelltAm: vor(60 * 24 * 6),
    }),
    e("e-idee-briefing", { art: "idee", titel: "Trainer-Briefing als 20-Minuten-Format vor dem Training?", bereichId: "p-hockey", erstelltAm: vor(60 * 16) }),
    e("e-idee-vorlage", { art: "idee", titel: "Eingangsdiagnostik als Vorlage für andere Vereine nutzbar machen", bereichId: "p-hockey", erstelltVon: RALPH, erstelltAm: vor(60 * 15) }),
    // Ausbildung
    e("e-ausbildung-ablauf", {
      art: "text",
      titel: "Ablauf der drei Ausbildungstage",
      bereichId: "p-ausbildung",
      inhalt: "Tag 1: Grundlagen und Denkmodelle.\nTag 2: Praxis – Diagnostik und Belastung.\nTag 3: Fallbeispiele (anonymisiert) und Transfer.",
      erstelltAm: vor(60 * 24 * 3),
    }),
    // Vortrag
    e("e-vortrag-folien", {
      art: "datei",
      quelle: "upload",
      titel: "Foliensatz Briefing Belastungssteuerung",
      bereichId: "p-vortrag",
      dateiName: "briefing-belastung.pdf",
      dateiTyp: "application/pdf",
      inhalt: "Belastung und Erholung – was Trainerteams im Alltag beobachten können.",
      erstelltAm: vor(60 * 24 * 4),
    }),
    // Persönlich
    e("e-plattform-idee", {
      art: "text",
      titel: "Idee: Wissensbausteine als Karteikarten für die Ausbildung",
      bereichId: "p-plattform",
      sichtbarkeit: "privat",
      inhalt: "Bausteine aus Meetings könnten direkt als Lernkarten in der Ausbildung auftauchen.",
      erstelltAm: vor(90),
    }),
    e("e-archiv-gedanke", {
      art: "sprache",
      titel: "Gedanke zum Archiv als Ideenspeicher",
      bereichId: "p-plattform",
      sichtbarkeit: "privat",
      inhalt: "Das Archiv nicht als Friedhof sehen, sondern als Speicher für Dinge, die ihrer Zeit voraus sind.",
      erstelltAm: vor(60 * 22),
    }),
  ];

  const regeln: Regel[] = [
    { id: "r1", begriffe: ["Knie"], tag: "knie", aktiv: true },
    { id: "r2", begriffe: ["Sprunggelenk"], tag: "sprunggelenk", aktiv: true },
    { id: "r3", begriffe: ["Hockey"], tag: "hockey", aktiv: true },
    { id: "r4", begriffe: ["Propriozept"], tag: "propriozeption", aktiv: true },
    { id: "r5", begriffe: ["Belastung", "Ermüdung"], tag: "belastung", aktiv: true },
    { id: "r6", begriffe: ["Nervensystem", "Gehirn"], tag: "nervensystem", aktiv: true },
    { id: "r7", begriffe: ["Kinder", "Jugend", "U14", "U16"], tag: "kinder-jugend", aktiv: true },
    { id: "r8", begriffe: ["Diagnostik", "Test"], tag: "diagnostik", aktiv: true },
    { id: "r9", begriffe: ["Studie"], tag: "studie", aktiv: true },
  ];

  const protokoll: ProtokollPunkt[] = [
    { id: "pp1", eintragId: "e-kickoff", typ: "entscheidung", text: "Die Eingangsdiagnostik wird für alle Spielerinnen einheitlich aufgebaut.", verantwortlich: null, erledigt: false, position: 1 },
    { id: "pp2", eintragId: "e-kickoff", typ: "entscheidung", text: "Für das Trainerteam gibt es ein eigenes kurzes Briefing-Format.", verantwortlich: null, erledigt: false, position: 2 },
    { id: "pp3", eintragId: "e-kickoff", typ: "offen", text: "Testauswahl für die Eingangsdiagnostik festlegen", verantwortlich: "Ralph K.", erledigt: false, position: 3 },
    { id: "pp4", eintragId: "e-kickoff", typ: "offen", text: "Termin für das Trainer-Briefing abstimmen", verantwortlich: "Olivia B.", erledigt: false, position: 4 },
    { id: "pp5", eintragId: "e-kickoff", typ: "offen", text: "Beispiele zur Belastungssteuerung sammeln", verantwortlich: null, erledigt: false, position: 5 },
  ];

  return {
    profile,
    bereiche,
    eintraege,
    tags: [],
    regeln,
    protokoll,
    verknuepfungen: [
      { a: "e-kickoff", b: "e-testbatterie" },
      { a: "e-trainerteam", b: "e-vortrag-folien" },
    ],
    bereichVerknuepfungen: [
      { a: "p-hockey", b: "p-ausbildung" },
      { a: "p-hockey", b: "r-studien" },
      { a: "p-vortrag", b: "r-folien" },
    ],
    zuordnungen: [],
    dateien: new Map(),
  };
}
