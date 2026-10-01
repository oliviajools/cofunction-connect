# Architektur

## Grundsätze

1. **Wissen, keine Patientendaten.** Fälle nur anonymisiert als Muster.
2. **Deterministisch in v1.** Menschen ordnen zu, Regeln vergeben Tags. Einzige ML-Komponente: Transkription.
3. **Viele Eingangswege, eine Pipeline.** Jeder Weg ist ein Adapter; danach läuft alles gleich.
4. **Wartungsarm.** Nur verwaltete Dienste, keine eigenen Server.
5. **Kein Lock-in.** Export als Markdown mit Metadaten jederzeit.

## Die Pipeline

```
Eingangsweg (Adapter)              Gemeinsame Pipeline (lib/pipeline.ts)
─────────────────────              ──────────────────────────────────────────────
Sprachnotiz / Meeting (PWA) ─┐
Datei-Upload                ─┼─► Eintrag + Datei ─► Text gewinnen ─► Regelwerk ─► fertig
Text                        ─┤    Status             Transkription    Tags mit
Mail (api/eingang/mail)     ─┘    „verarbeitung“     PDF-/Textauszug  Begründung
später: Messenger, Kalender …

Zuordnung zu Projekt/Area: durch Menschen – beim Erfassen, über die Mail-Adresse oder im Eingang.
```

- Uploads gehen **direkt vom Browser in den Speicher** (signierte Upload-URL) – so scheitern lange Meetings nicht an Größenlimits von Serverfunktionen.
- Die Verarbeitung startet nach der Antwort (`after()`), Status und Fehler stehen am Eintrag. Ein täglicher Cron-Job (`/api/verarbeitung`) greift hängengebliebene Einträge auf.
- Ein neuer Eingangsweg = eine Funktion, die Einträge anlegt (Vorbild: `lib/mail.ts`).

## Wo später KI andockt

Die Stufe **Zuordnen** ist bewusst getrennt. Jede händische Zuordnung wird in `zuordnungen` gespeichert (von → nach, wer, wann). Bevor KI-Vorschläge irgendetwas entscheiden dürfen, lassen sie sich an genau diesen Daten messen. Die Suche ist für semantische Suche vorbereitet (pgvector in Supabase verfügbar).

## Datenmodell (Supabase / Postgres)

| Tabelle | Zweck |
|---|---|
| `profile` | Teammitglieder (automatisch bei Einladung; erste Person = Admin) |
| `bereiche` | Projekte, Areas, Ressourcen, Archiv; `slug` für Mail-Routing; `sichtbarkeit` team/privat |
| `eintraege` | Alles Erfasste. `bereich_id = null` → Eingang. `eltern_id` für Anhänge und Bausteine. `transkript` (JSON-Segmente mit Sprecher und Zeit). `suchtext` = deutscher Volltextindex |
| `tags`, `eintrag_tags` | Tags mit Quelle (`regel` / `manuell` / `mail`) und auslösendem Wort |
| `regeln` | Begriffe → Tag |
| `protokoll_punkte` | Entscheidungen und offene Punkte eines Meetings |
| `verknuepfungen` | Manuelle Links zwischen Einträgen |
| `zuordnungen` | Protokoll jeder Zuordnung |

**Rechte** stehen in der Datenbank (Row Level Security), nicht im App-Code: Nur Teammitglieder sehen etwas; Privates nur die Besitzerin; niemand kann im Namen anderer anlegen; Dateien liegen im privaten Bucket `dateien` unter `<nutzer-id>/…`. Getestet mit echtem Postgres und PostgREST.

## Code-Aufbau

```
app/
  (app)/            Seiten hinter der Anmeldung (Übersicht, Erfassen, Eingang, Bereiche, Eintrag, Suche, Regelwerk, Konto)
  aktionen.ts       Server Actions – alle Änderungen, mit Eingabeprüfung (zod)
  api/eingang/mail  Mail-Webhook (Postmark)
  api/verarbeitung  Cron-Sicherheitsnetz
  api/export        ZIP-Export
  login, auth/      Anmeldung per E-Mail und Passwort
lib/
  data/types.ts     Domänenmodell + Repo-Schnittstelle
  data/demo-repo.ts Demo: im Speicher, mit Beispieldaten (spiegelt die Rechte)
  data/supabase-repo.ts  Echtbetrieb
  regeln.ts         Regelwerk (rein, getestet)
  pipeline.ts       Verarbeitung
  transkription.ts  Mistral Voxtral
  extraktion.ts     PDF/Text
  mail.ts           Mail-Adapter
  export.ts         Markdown-Export
components/         Oberfläche
supabase/           Schema (migrations/) und Startdaten
proxy.ts            Session-Erneuerung + Umleitung zur Anmeldung (Next.js 16: ehemals middleware)
```

## Demo-Modus

Ohne Supabase-Variablen nutzt die App `DemoRepo`: alles im Arbeitsspeicher, Beispieldaten, Personenwechsel unter „Konto“. Ideal zum Zeigen und für Tests – nichts wird dauerhaft gespeichert.

## Gestaltung

Angelehnt an cofunction.de: Schiefer-Blaugrau `#586A7A`, weiße Schrift auf Flächen, große Rundungen, leichte geometrische Groteskschrift (League Spartan als freie Annäherung, Figtree für Fließtext – beide selbst gehostet, keine Google-Verbindung). Das Schalter-Motiv aus dem Logo ist der Team/Persönlich-Schalter.
