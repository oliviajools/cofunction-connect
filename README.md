# CoFunction Wissensplattform

Die Plattform, auf der das Wissen des CoFunction-Teams zusammenläuft – gesprochen, weitergeleitet, hochgeladen oder aufgeschrieben.

**Version 1 arbeitet deterministisch:** Menschen ordnen zu, ein sichtbares Regelwerk vergibt Tags, Meeting-Protokolle entstehen von Hand. Die einzige ML-Komponente ist die Transkription (Sprache → Text). Die Plattform enthält **Wissen, keine Patientendaten.**

## Was sie kann

| Bereich | Funktion |
|---|---|
| **Erfassen** | Sprachnotiz und Meeting direkt am Handy aufnehmen (installierbar als App), Dateien hochladen, Text notieren. Ziel wird beim Erfassen per Tipp gewählt – oder es landet im Eingang. |
| **Weiterleiten** | Mails an `wissen@…` landen im Eingang, an `wissen+<bereich>@…` direkt im Bereich. `#tag` im Betreff setzt Tags. Nur Teammitglieder als Absender. |
| **Eingang** | Alles ohne Ziel. Händische Zuordnung; jede Zuordnung wird protokolliert (Maßstab für spätere KI-Vorschläge). |
| **Bereiche** | Projekte, Areas, Ressourcen, Archiv (PARA). Pro Bereich: Wissen, Meetings, Brainstorm. Privat oder fürs Team. |
| **Mindmap** | Bereiche und Projekte als interaktiver Graph: Eltern-Kind-Hierarchie plus eigene Verknüpfungen. Pan, Zoom, Knoten ziehen, Klick öffnet den Bereich. |
| **Meetings** | Transkript mit Sprechertrennung und Zeitmarken, synchron zur Aufnahme. Protokoll von Hand: Entscheidungen, offene Punkte, Wissensbausteine aus markierten Stellen. |
| **Regelwerk** | „Begriff → Tag“, live testbar, auf alle Einträge neu anwendbar. Plus Übersicht aller Mail-Adressen. |
| **Suche** | Volltext (deutsche Wortformen) über Titel, Transkripte, PDF-Texte; Filter nach Art und Tag. |
| **Export** | Alles als Markdown mit Metadaten (.zip) – kein Lock-in. |
| **Team / Persönlich** | Schalter zwischen gemeinsamer und privater Sicht. Private Inhalte sieht nur die Besitzerin (in der Datenbank erzwungen). |

## Schnellstart (lokal, Demo-Modus)

```bash
npm install
npm run dev
```

Öffne http://localhost:3000. Ohne Konfiguration läuft die App mit Beispieldaten im Speicher.

## Echtbetrieb

Schritt-für-Schritt-Anleitung: **[docs/EINRICHTUNG.md](docs/EINRICHTUNG.md)** (Supabase, Vercel, Mistral, Mail-Eingang – ca. 45 Minuten).

## Technik

Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage, Frankfurt) · Mistral Voxtral (Transkription) · Vercel (Frankfurt). Details und Designentscheidungen: **[docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md)**.

```bash
npm test          # Unit-Tests (Regelwerk, Mail-Adapter, Pipeline, Rechte, Export)
npm run typecheck
npm run lint
npm run build
```

## Wartung (ca. 3–4 h/Woche)

- **Eingang sichten** und zuordnen.
- **Regelwerk pflegen:** Wo keine Regel greift oder falsche Tags entstehen, Begriffe ergänzen und „Neu anwenden“.
- **Fehler prüfen:** Einträge mit Status „Fehler“ zeigen die Ursache; „Erneut verarbeiten“ wiederholt.
- **Monatlich:** Export herunterladen und ablegen; Supabase-Nutzung (Speicher) im Dashboard ansehen.
