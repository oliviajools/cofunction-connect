-- CoFunction Wissensplattform – Bereichs-Verknüpfungen für die Mindmap
-- Explizite Verknüpfungen zwischen Bereichen (Obsidian-ähnlich), ergänzt zu Eltern-Kind.

create table public.bereich_verknuepfungen (
  von_id       uuid not null references public.bereiche (id) on delete cascade,
  nach_id      uuid not null references public.bereiche (id) on delete cascade,
  erstellt_von uuid not null default auth.uid() references public.profile (id),
  erstellt_am  timestamptz not null default now(),
  primary key (von_id, nach_id),
  check (von_id < nach_id)
);

alter table public.bereich_verknuepfungen enable row level security;

create policy bereich_verknuepfungen_lesen on public.bereich_verknuepfungen for select
  using (exists (select 1 from public.bereiche b where b.id = von_id)
     and exists (select 1 from public.bereiche b where b.id = nach_id));

create policy bereich_verknuepfungen_anlegen on public.bereich_verknuepfungen for insert
  with check (erstellt_von = auth.uid()
     and exists (select 1 from public.bereiche b where b.id = von_id)
     and exists (select 1 from public.bereiche b where b.id = nach_id));

create policy bereich_verknuepfungen_loeschen on public.bereich_verknuepfungen for delete
  using (exists (select 1 from public.bereiche b where b.id = von_id));
