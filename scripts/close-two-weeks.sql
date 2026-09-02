-- Beauty by Sevda — stäng tider (röda, inga bokningar/mejl)
-- Fransar: 2–16 sep 2026 (2 veckor)
-- Naglar: 2–6 sep 2026 (t.o.m. lördag)
-- Kör i Supabase → SQL Editor → Run

-- Ta bort gamla “stäng allt”-nycklar i intervallet
delete from bbs_closed_slots
where slot_key in (
  select d::text || '|' || t
  from generate_series(date '2026-09-02', date '2026-09-16', interval '1 day') as d,
       unnest(array['10:00', '12:15', '14:30', '16:45']) as t
);

-- Fransar 2 veckor
insert into bbs_closed_slots (slot_key)
select d::text || '|' || t || '|fransar'
from generate_series(date '2026-09-02', date '2026-09-16', interval '1 day') as d,
     unnest(array['10:00', '12:15', '14:30', '16:45']) as t
on conflict (slot_key) do nothing;

-- Naglar t.o.m. lördag 6 sep
insert into bbs_closed_slots (slot_key)
select d::text || '|' || t || '|naglar'
from generate_series(date '2026-09-02', date '2026-09-06', interval '1 day') as d,
     unnest(array['10:00', '12:15', '14:30', '16:45']) as t
on conflict (slot_key) do nothing;
