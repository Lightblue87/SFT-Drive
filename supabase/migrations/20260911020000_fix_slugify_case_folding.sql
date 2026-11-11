-- Fix (found by automated PR review on #17): slugify_text() (20260911000000)
-- replaced 'Ä'/'Ö'/'Ü' with 'Ae'/'Oe'/'Ue' BEFORE lower(), while the translate()
-- table that reduces every other accented letter to its plain base form only
-- lists lowercase accented characters and therefore only ever fires AFTER
-- lower() has run. Consequence: an uppercase umlaut took the two-letter
-- expansion path while the same letter lowercase (or handled by the PWA's own
-- slugify(), which lower-cases first and then NFD-strips combining marks —
-- src/pages/admin/AdminTourFormPage.tsx) took the single-letter reduction path.
-- "Über" -> "ueber", but "über" and the PWA's "Über" both -> "uber". Two tours
-- with the same title differing only in that capitalization/client would not
-- collide and would silently miss the required numeric-suffix disambiguation
-- (§8.3 "wird serverseitig automatisch durch einen angehängten numerischen
-- Suffix aufgelöst").
--
-- Fix: lower() first, then translate() on the now-lowercase text, matching the
-- PWA's slugify() base-letter reduction (no digraph expansion) so both clients
-- produce byte-identical base slugs for the same title regardless of case.
create or replace function public.slugify_text(p_text text)
returns text language sql immutable set search_path = public
as $$
  select trim(both '-' from regexp_replace(
    translate(
      lower(coalesce(p_text, '')),
      'ßàáâãäåāăąèéêëēĕėęěìíîïĩīĭįòóôõöøōŏőùúûüũūŭůűųñńçćčđďĝģĥĵķĺľłńņňŕřśşšťţůźżž',
      'saaaaaaaaaeeeeeeeeeiiiiiiiiooooooooouuuuuuuuunnccccddgghjklllnnrrssstuzzz'
    ),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;
