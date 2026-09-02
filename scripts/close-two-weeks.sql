-- Stäng alla standardtider 2 sep–16 sep 2026 (väntar på fransar).
-- Kör i Supabase → SQL Editor → Run.

insert into bbs_closed_slots (slot_key)
select d::text || '|' || t
from generate_series(date '2026-09-02', date '2026-09-16', interval '1 day') as d,
     unnest(array['10:00', '12:15', '14:30', '16:45']) as t
on conflict (slot_key) do nothing;
