<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Projekt: CoFunction Wissensplattform

- Sprache: Code-Bezeichner, UI-Texte, Kommentare und Datenbank auf **Deutsch**.
- v1 ist **deterministisch**: keine KI-Entscheidungen. Einzige ML-Komponente ist die Transkription (`lib/transkription.ts`).
- Daten nur über die `Repo`-Schnittstelle (`lib/data/types.ts`); `DemoRepo` und `SupabaseRepo` müssen sich gleich verhalten (Demo spiegelt die RLS-Regeln).
- Änderungen laufen über Server Actions in `app/aktionen.ts` (Eingaben mit zod prüfen, IDs mit dem `Id`-Schema).
- Rechte gehören in die Datenbank (RLS in `supabase/migrations`). Neue Tabellen immer mit RLS.
- Keine Patientendaten. Keine Schlüssel im Code.
- Vor dem Commit: `npm test && npm run typecheck && npm run lint && npm run build`.
- Details: `docs/ARCHITEKTUR.md`, Einrichtung: `docs/EINRICHTUNG.md`.
