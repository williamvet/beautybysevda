-- SAFE: only inspect bookings + closed slots. Do NOT delete bookings.
-- Run in Supabase SQL Editor.

select id, date_key, time, status, name, service_name, category, manage_token
from bbs_bookings
where status = 'active'
order by date_key, time;

select slot_key from bbs_closed_slots order by slot_key;

select slot_key from bbs_extra_slots order by slot_key;
