-- Optionales YouTube-Video pro Tour (Ergänzung, siehe CLAUDE.md "Entwicklungsphase 20").
--
-- Bewusst auf der öffentlichen `tours`-Zeile statt in `tour_participant_details`:
-- ein Tour-Promo-/Ankündigungsvideo ist wie das Titelbild (`cover_image_url`)
-- ein öffentlicher Marketinginhalt und kein interner Teilnehmer-Inhalt (§8, §10)
-- — es enthält keinen Treffpunkt, Kurviger- oder Zello-Zugang.
alter table public.tours
  add column if not exists youtube_url text null,
  add column if not exists youtube_embed boolean not null default true;

comment on column public.tours.youtube_url is
  'Optionale YouTube-Video-URL (Ankündigung/Rückblick). Öffentlich, da Marketinginhalt wie cover_image_url.';
comment on column public.tours.youtube_embed is
  'true = eingebettet anzeigen (per Klick geladen), false = nur als Link. Kein Einfluss auf Berechtigung/Speicherung.';
