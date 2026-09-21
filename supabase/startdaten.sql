-- Startdaten: die fünf Leistungsfelder als Areas, Ressourcen, Archiv und ein erstes Regelwerk.
-- Erst ausführen, NACHDEM sich die erste Person (Admin) einmal angemeldet hat.

with admin as (select id from public.profile where rolle = 'admin' order by erstellt_am limit 1)
insert into public.bereiche (art, name, slug, beschreibung, besitzer_id)
select v.art, v.name, v.slug, v.beschreibung, admin.id
from admin, (values
  ('area',      'Performance Sports',      'performance-sports', 'Aktivierung aller Funktionen für den Leistungssport.'),
  ('area',      'Potenziale von Kindern',  'kinder',             'Potenziale erkennen und entfalten.'),
  ('area',      'Individuelle Behandlung', 'behandlung',         'Sprechstunde und Therapie – nur Wissen, keine Patientendaten.'),
  ('area',      'Meducation',              'meducation',         'Fortbildungen, Vorträge, Ausbildung.'),
  ('area',      'Strategieberatung',       'strategie',          'Konzepte für Vereine und Verbände.'),
  ('ressource', 'Studien',                 'studie',             'Gesammelte Fachliteratur.'),
  ('ressource', 'Folien & Vorlagen',       'folien',             'Vortragsfolien und Vorlagen.'),
  ('archiv',    'Archiv',                  'archiv',             'Abgeschlossenes und Ideen ohne aktuellen Platz.')
) as v(art, name, slug, beschreibung)
on conflict (slug) do nothing;

insert into public.tags (name) values
  ('knie'), ('sprunggelenk'), ('hockey'), ('propriozeption'), ('belastung'),
  ('nervensystem'), ('kinder-jugend'), ('diagnostik'), ('studie')
on conflict (name) do nothing;

insert into public.regeln (begriffe, tag_id)
select v.begriffe, t.id
from (values
  (array['Knie'],                         'knie'),
  (array['Sprunggelenk'],                 'sprunggelenk'),
  (array['Hockey'],                       'hockey'),
  (array['Propriozept'],                  'propriozeption'),
  (array['Belastung', 'Ermüdung'],        'belastung'),
  (array['Nervensystem', 'Gehirn'],       'nervensystem'),
  (array['Kinder', 'Jugend', 'U14', 'U16'], 'kinder-jugend'),
  (array['Diagnostik', 'Test'],           'diagnostik'),
  (array['Studie'],                       'studie')
) as v(begriffe, tag)
join public.tags t on t.name = v.tag
where not exists (select 1 from public.regeln);
