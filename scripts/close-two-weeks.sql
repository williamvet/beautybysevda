-- Stäng BARA fransar 2–16 sep 2026. Naglar förblir öppna.
-- Tar bort gamla “stäng allt”-nycklar i intervallet först.
-- Kör i Supabase → SQL Editor → Run.

delete from bbs_closed_slots
where slot_key in (
  select d::text || '|' || t
  from generate_series(date '2026-09-02', date '2026-09-16', interval '1 day') as d,
       unnest(array['10:00', '12:15', '14:30', '16:45']) as t
);

insert into bbs_closed_slots (slot_key)
select d::text || '|' || t || '|fransar'
from generate_series(date '2026-09-02', date '2026-09-16', interval '1 day') as d,
     unnest(array['10:00', '12:15', '14:30', '16:45']) as t
on conflict (slot_key) do nothing;
