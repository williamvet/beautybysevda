-- Beauty by Sevda — kör en gång: SQL Editor → New query → klistra in → Run

create table if not exists bbs_bookings (
  id uuid primary key default gen_random_uuid(),
  manage_token text unique not null,
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  email text not null default '',
  note text,
  service_id text not null,
  service_name text not null,
  category text not null,
  date_key text not null,
  time text not null,
  duration_minutes int not null,
  price int not null,
  status text not null default 'active',
  notified_sevda boolean default false,
  notified_customer boolean default false,
  cancelled_at timestamptz
);

create index if not exists bbs_bookings_date_key_idx on bbs_bookings (date_key);
create index if not exists bbs_bookings_status_idx on bbs_bookings (status);
create index if not exists bbs_bookings_manage_token_idx on bbs_bookings (manage_token);

create table if not exists bbs_closed_slots (
  slot_key text primary key
);

create table if not exists bbs_extra_slots (
  slot_key text primary key
);

alter table bbs_bookings enable row level security;
alter table bbs_closed_slots enable row level security;
alter table bbs_extra_slots enable row level security;

-- Förhindra dubbelbokning på samma starttid (aktiva)
create unique index if not exists bbs_bookings_active_slot_uidx
  on bbs_bookings (date_key, time)
  where status = 'active';
