-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_net" with schema extensions; -- harmless if missing
create extension if not exists "vector"; -- for future embeddings

-- Organizations & memberships
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists profiles (
  user_id uuid primary key,
  name text,
  default_org_id uuid references organizations(id),
  created_at timestamptz default now()
);

create table if not exists memberships (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','contributor','viewer')),
  created_at timestamptz default now(),
  unique (org_id, user_id)
);

-- Trips & Sections
create table if not exists trips (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  status text not null default 'planned',
  location_city text,
  location_country text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sections (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  type text not null check (type in ('accommodation','flight','itinerary','transport','document','expense','other')),
  title text,
  sort_order int default 0
);

create table if not exists flights (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  traveler_email text,
  airline text,
  flight_no text,
  dep_airport text,
  arr_airport text,
  dep_time timestamptz,
  arr_time timestamptz,
  pnr text,
  notes text
);

create table if not exists accommodations (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  property_name text,
  address text,
  check_in date,
  check_out date,
  confirmation_no text,
  room_type text,
  cost_currency text,
  cost_amount numeric,
  notes text
);

create table if not exists itinerary_items (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  start_time timestamptz,
  end_time timestamptz,
  title text,
  location text,
  description text
);

create table if not exists transports (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  transport_type text,
  vendor text,
  pickup text,
  dropoff text,
  start_time timestamptz,
  end_time timestamptz,
  confirmation_no text,
  cost_currency text,
  cost_amount numeric,
  notes text
);

create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references trips(id) on delete cascade,
  storage_key text not null,
  original_filename text,
  mime_type text,
  parsed_json jsonb,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Basic indexes
create index if not exists trips_org_idx on trips(org_id, start_date);
create index if not exists docs_trip_idx on documents(trip_id);

-- RLS
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table trips enable row level security;
alter table sections enable row level security;
alter table flights enable row level security;
alter table accommodations enable row level security;
alter table itinerary_items enable row level security;
alter table transports enable row level security;
alter table documents enable row level security;

-- Helper: check user membership in org
create or replace function is_org_member(p_org uuid, p_user uuid)
returns boolean language sql stable as $$
  select exists (select 1 from memberships m where m.org_id = p_org and m.user_id = p_user);
$$;

-- Policies: users can read their orgs & trips; write when member
create policy "read orgs" on organizations for select using (exists (select 1 from memberships m where m.org_id = id and m.user_id = auth.uid()));
create policy "read profiles self" on profiles for select using (user_id = auth.uid());
create policy "upsert profiles self" on profiles for insert with check (user_id = auth.uid());
create policy "upsert profiles self upd" on profiles for update using (user_id = auth.uid());

create policy "read memberships for members" on memberships for select using (user_id = auth.uid() or exists (select 1 from memberships m where m.org_id = memberships.org_id and m.user_id = auth.uid()));
create policy "insert memberships by org admins" on memberships for insert with check (exists (select 1 from memberships m where m.org_id = memberships.org_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "delete memberships by org admins" on memberships for delete using (exists (select 1 from memberships m where m.org_id = memberships.org_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create policy "trips select" on trips for select using (is_org_member(org_id, auth.uid()));
create policy "trips insert" on trips for insert with check (is_org_member(org_id, auth.uid()));
create policy "trips update" on trips for update using (is_org_member(org_id, auth.uid()));
create policy "trips delete" on trips for delete using (is_org_member(org_id, auth.uid()));

create policy "sections all" on sections for all using (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid()))) with check (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid())));
create policy "flights all" on flights for all using (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid()))) with check (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid())));
create policy "accommodations all" on accommodations for all using (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid()))) with check (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid())));
create policy "itinerary all" on itinerary_items for all using (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid()))) with check (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid())));
create policy "transports all" on transports for all using (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid()))) with check (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid())));
create policy "documents all" on documents for all using (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid()))) with check (exists (select 1 from trips t where t.id = trip_id and is_org_member(t.org_id, auth.uid())));
