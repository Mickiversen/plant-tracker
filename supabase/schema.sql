-- Plant Tracker schema
-- Run this in the Supabase SQL editor

create type light_level as enum ('low', 'medium', 'high', 'direct');
create type care_action as enum ('watered', 'fertilized', 'repotted', 'other');

-- Plants
create table plants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  species text,
  location text,
  photo_url text,
  notes text,
  created_at timestamptz default now()
);

-- Care needs (1:1 with plants)
create table care_needs (
  plant_id uuid primary key references plants(id) on delete cascade,
  water_every_days int not null default 7,
  light_level light_level not null default 'medium',
  soil_type text,
  fertilize_every_days int,
  light_ppfd text,
  light_dli text,
  humidity_min int,
  humidity_max int,
  temp_min int,
  temp_max int,
  repot_every_days int
);

-- Care log (event log)
create table care_log (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id) on delete cascade,
  action care_action not null,
  logged_at timestamptz default now(),
  notes text
);

-- Index for fast "last watered" lookups
create index care_log_plant_action_idx on care_log(plant_id, action, logged_at desc);

-- View: plants with their care needs and last watered date
create view plant_overview as
select
  p.*,
  cn.water_every_days,
  cn.light_level,
  cn.soil_type,
  cn.fertilize_every_days,
  cn.light_ppfd,
  cn.light_dli,
  cn.humidity_min,
  cn.humidity_max,
  cn.temp_min,
  cn.temp_max,
  cn.repot_every_days,
  max(cl.logged_at) filter (where cl.action = 'watered')    as last_watered_at,
  max(cl.logged_at) filter (where cl.action = 'fertilized') as last_fertilized_at,
  max(cl.logged_at) filter (where cl.action = 'repotted')   as last_repotted_at
from plants p
left join care_needs cn on cn.plant_id = p.id
left join care_log cl on cl.plant_id = p.id
group by p.id, cn.plant_id;
