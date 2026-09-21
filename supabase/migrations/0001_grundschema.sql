-- CoFunction Wissensplattform – Grundschema
-- Einmal im Supabase SQL-Editor ausführen (oder per `supabase db push`).
-- Prinzip: Die Plattform enthält WISSEN, keine Patientendaten.

-- ───────────────────────── Profile ─────────────────────────
create table public.profile (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  kuerzel     text not null,
  email       text not null unique,
  rolle       text not null default 'mitglied' check (rolle in ('admin', 'mitglied')),
  erstellt_am timestamptz not null default now()
);

-- Neue (eingeladene) Nutzer bekommen automatisch ein Profil
create or replace function public.neues_profil() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  anzeigename text := coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1));
begin
  insert into public.profile (id, name, kuerzel, email, rolle)
  values (
    new.id,
    anzeigename,
    -- Initialen: „Olivia B.“ → OB, „Ralph“ → RA
    upper(left(split_part(anzeigename, ' ', 1), 1) ||
          coalesce(left(nullif(split_part(anzeigename, ' ', 2), ''), 1), substr(split_part(anzeigename, ' ', 1), 2, 1))),
    lower(new.email),
    case when not exists (select 1 from public.profile) then 'admin' else 'mitglied' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger auth_neues_profil
  after insert on auth.users
  for each row execute function public.neues_profil();

-- Hilfsfunktion: Ist die aktuelle Person Teammitglied?
create or replace function public.ist_mitglied() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profile where id = auth.uid())
$$;

-- ───────────────────────── Bereiche (PARA) ─────────────────────────
create table public.bereiche (
  id           uuid primary key default gen_random_uuid(),
  art          text not null check (art in ('projekt', 'area', 'ressource', 'archiv')),
  name         text not null check (length(name) between 1 and 120),
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,47}$'),
  beschreibung text not null default '',
  sichtbarkeit text not null default 'team' check (sichtbarkeit in ('team', 'privat')),
  besitzer_id  uuid not null default auth.uid() references public.profile (id),
  eltern_id    uuid references public.bereiche (id) on delete set null,
  aktiv        boolean not null default true,
  erstellt_am  timestamptz not null default now()
);

-- ───────────────────────── Einträge ─────────────────────────
create table public.eintraege (
  id              uuid primary key default gen_random_uuid(),
  art             text not null check (art in ('sprache', 'meeting', 'mail', 'datei', 'text', 'baustein', 'idee')),
  quelle          text not null default 'app' check (quelle in ('app', 'mail', 'upload')),
  titel           text not null default '',
  inhalt          text not null default '',
  bereich_id      uuid references public.bereiche (id) on delete set null,   -- null = Eingang
  sichtbarkeit    text not null default 'team' check (sichtbarkeit in ('team', 'privat')),
  erstellt_von    uuid not null default auth.uid() references public.profile (id),
  erstellt_am     timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now(),
  status          text not null default 'bereit' check (status in ('verarbeitung', 'bereit', 'fehler', 'ohne_transkription')),
  fehler          text,
  transkript      jsonb,
  audio_pfad      text,
  datei_pfad      text,
  datei_name      text,
  datei_typ       text,
  eltern_id       uuid references public.eintraege (id) on delete cascade,
  meta            jsonb not null default '{}'::jsonb,
  suchtext        tsvector generated always as (
                    setweight(to_tsvector('german', coalesce(titel, '')), 'A') ||
                    setweight(to_tsvector('german', coalesce(inhalt, '')), 'B')
                  ) stored
);

create index eintraege_suchtext_idx on public.eintraege using gin (suchtext);
create index eintraege_bereich_idx on public.eintraege (bereich_id);
create index eintraege_eltern_idx on public.eintraege (eltern_id);
create index eintraege_erstellt_idx on public.eintraege (erstellt_am desc);
create index eintraege_status_idx on public.eintraege (status) where status in ('verarbeitung', 'fehler');

create or replace function public.aktualisiert_setzen() returns trigger language plpgsql as $$
begin
  new.aktualisiert_am := now();
  return new;
end $$;

create trigger eintraege_aktualisiert
  before update on public.eintraege
  for each row execute function public.aktualisiert_setzen();

-- ───────────────────────── Tags & Regelwerk ─────────────────────────
create table public.tags (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique check (name ~ '^[[:alnum:]][[:alnum:]-]*$' and name = lower(name))
);

create table public.eintrag_tags (
  eintrag_id uuid not null references public.eintraege (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,
  quelle     text not null default 'manuell' check (quelle in ('regel', 'manuell', 'mail')),
  regel_wort text,
  primary key (eintrag_id, tag_id)
);
create index eintrag_tags_tag_idx on public.eintrag_tags (tag_id);

create table public.regeln (
  id          uuid primary key default gen_random_uuid(),
  begriffe    text[] not null check (cardinality(begriffe) > 0),
  tag_id      uuid not null references public.tags (id) on delete cascade,
  aktiv       boolean not null default true,
  erstellt_am timestamptz not null default now()
);

-- ───────────────────────── Meeting-Protokolle ─────────────────────────
create table public.protokoll_punkte (
  id             uuid primary key default gen_random_uuid(),
  eintrag_id     uuid not null references public.eintraege (id) on delete cascade,
  typ            text not null check (typ in ('entscheidung', 'offen')),
  text           text not null,
  verantwortlich text,
  erledigt       boolean not null default false,
  position       integer not null default 0
);
create index protokoll_eintrag_idx on public.protokoll_punkte (eintrag_id, position);

-- ───────────────────────── Verknüpfungen ─────────────────────────
create table public.verknuepfungen (
  von_id       uuid not null references public.eintraege (id) on delete cascade,
  nach_id      uuid not null references public.eintraege (id) on delete cascade,
  erstellt_von uuid not null default auth.uid() references public.profile (id),
  primary key (von_id, nach_id),
  check (von_id < nach_id)
);

-- ───────────────────────── Zuordnungs-Protokoll ─────────────────────────
-- Jede händische Zuordnung wird festgehalten. Das ist später der Maßstab,
-- an dem KI-Vorschläge gemessen werden, bevor sie irgendetwas entscheiden dürfen.
create table public.zuordnungen (
  id              uuid primary key default gen_random_uuid(),
  eintrag_id      uuid not null references public.eintraege (id) on delete cascade,
  von_bereich_id  uuid references public.bereiche (id) on delete set null,
  nach_bereich_id uuid references public.bereiche (id) on delete set null,
  von_nutzer      uuid not null default auth.uid() references public.profile (id),
  am              timestamptz not null default now()
);

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profile          enable row level security;
alter table public.bereiche         enable row level security;
alter table public.eintraege        enable row level security;
alter table public.tags             enable row level security;
alter table public.eintrag_tags     enable row level security;
alter table public.regeln           enable row level security;
alter table public.protokoll_punkte enable row level security;
alter table public.verknuepfungen   enable row level security;
alter table public.zuordnungen      enable row level security;

-- Profile: Team sieht Team, jede Person ändert nur sich selbst
create policy profile_lesen on public.profile for select using (public.ist_mitglied());
create policy profile_eigenes on public.profile for update using (id = auth.uid()) with check (id = auth.uid());

-- Bereiche: team = alle, privat = nur Besitzerin
create policy bereiche_lesen on public.bereiche for select
  using (public.ist_mitglied() and (sichtbarkeit = 'team' or besitzer_id = auth.uid()));
create policy bereiche_anlegen on public.bereiche for insert
  with check (public.ist_mitglied() and besitzer_id = auth.uid());
create policy bereiche_aendern on public.bereiche for update
  using (public.ist_mitglied() and (sichtbarkeit = 'team' or besitzer_id = auth.uid()))
  with check (sichtbarkeit = 'team' or besitzer_id = auth.uid());
create policy bereiche_loeschen on public.bereiche for delete using (besitzer_id = auth.uid());

-- Einträge: team = alle, privat = nur Erstellerin
create policy eintraege_lesen on public.eintraege for select
  using (public.ist_mitglied() and (sichtbarkeit = 'team' or erstellt_von = auth.uid()));
create policy eintraege_anlegen on public.eintraege for insert
  with check (public.ist_mitglied() and erstellt_von = auth.uid());
create policy eintraege_aendern on public.eintraege for update
  using (public.ist_mitglied() and (sichtbarkeit = 'team' or erstellt_von = auth.uid()))
  with check (sichtbarkeit = 'team' or erstellt_von = auth.uid());
create policy eintraege_loeschen on public.eintraege for delete
  using (public.ist_mitglied() and (erstellt_von = auth.uid() or sichtbarkeit = 'team'));

-- Tags und Regelwerk: gemeinsam gepflegt
create policy tags_lesen on public.tags for select using (public.ist_mitglied());
create policy tags_anlegen on public.tags for insert with check (public.ist_mitglied());
create policy tags_aendern on public.tags for update using (public.ist_mitglied());
create policy regeln_alles on public.regeln for all using (public.ist_mitglied()) with check (public.ist_mitglied());

-- Abhängige Tabellen erben die Sichtbarkeit ihres Eintrags
create policy eintrag_tags_alles on public.eintrag_tags for all
  using (exists (select 1 from public.eintraege e where e.id = eintrag_id))
  with check (exists (select 1 from public.eintraege e where e.id = eintrag_id));
create policy protokoll_alles on public.protokoll_punkte for all
  using (exists (select 1 from public.eintraege e where e.id = eintrag_id))
  with check (exists (select 1 from public.eintraege e where e.id = eintrag_id));
create policy verknuepfungen_lesen on public.verknuepfungen for select
  using (exists (select 1 from public.eintraege e where e.id = von_id)
     and exists (select 1 from public.eintraege e where e.id = nach_id));
create policy verknuepfungen_anlegen on public.verknuepfungen for insert
  with check (erstellt_von = auth.uid()
     and exists (select 1 from public.eintraege e where e.id = von_id)
     and exists (select 1 from public.eintraege e where e.id = nach_id));
create policy verknuepfungen_loeschen on public.verknuepfungen for delete
  using (exists (select 1 from public.eintraege e where e.id = von_id));
create policy zuordnungen_lesen on public.zuordnungen for select using (public.ist_mitglied());
create policy zuordnungen_anlegen on public.zuordnungen for insert
  with check (public.ist_mitglied() and von_nutzer = auth.uid());

-- ───────────────────────── Dateispeicher ─────────────────────────
-- Größenlimit pro Datei folgt dem Supabase-Tarif (Free: 50 MB ≈ 3 h Sprachaufnahme im App-Format)
insert into storage.buckets (id, name, public)
values ('dateien', 'dateien', false)
on conflict (id) do nothing;

create policy dateien_lesen on storage.objects for select
  using (bucket_id = 'dateien' and public.ist_mitglied());
create policy dateien_hochladen on storage.objects for insert
  with check (bucket_id = 'dateien' and public.ist_mitglied() and (storage.foldername(name))[1] = auth.uid()::text);
create policy dateien_loeschen on storage.objects for delete
  using (bucket_id = 'dateien' and public.ist_mitglied());
