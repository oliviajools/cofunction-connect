-- CoFunction Wissensplattform – Erweiterter Volltextindex
-- Titel wird höher gewichtet als Inhalt; Dateinamen sind auch durchsuchbar.

drop index if exists eintraege_suchtext_idx;

alter table public.eintraege
  drop column if exists suchtext;

alter table public.eintraege
  add column suchtext tsvector generated always as (
    setweight(to_tsvector('german', coalesce(titel, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(inhalt, '')), 'B') ||
    setweight(to_tsvector('german', coalesce(datei_name, '')), 'C')
  ) stored;

create index eintraege_suchtext_idx on public.eintraege using gin (suchtext);
