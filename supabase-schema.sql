-- Comic hosting schema

-- Series table
create table if not exists series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_panel_id uuid, -- references panels(id), set after panels are created
  autoplay_speed numeric not null default 3.5, -- seconds between panels
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Panels table
create table if not exists panels (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series(id) on delete cascade,
  image_url text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Add foreign key for cover_panel_id after panels table exists
alter table series
  add constraint fk_cover_panel
  foreign key (cover_panel_id)
  references panels(id)
  on delete set null;

-- Indexes
create index if not exists panels_series_id_idx on panels(series_id);
create index if not exists panels_display_order_idx on panels(series_id, display_order);
create index if not exists series_slug_idx on series(slug);

-- Storage bucket for panel images
-- Run this in Supabase dashboard or via API:
-- insert into storage.buckets (id, name, public) values ('panels', 'panels', true);

-- Row Level Security (RLS)
-- For a simple public site, we allow public reads.
-- Admin writes go through API routes using the service role key (or anon with permissive policies).

alter table series enable row level security;
alter table panels enable row level security;

-- Public read access
create policy "Public can read series"
  on series for select
  using (true);

create policy "Public can read panels"
  on panels for select
  using (true);

-- Allow all mutations (admin checks happen at the API route layer via ADMIN_PASSWORD cookie)
-- In production, use the service role key in API routes instead.
create policy "Allow all inserts on series"
  on series for insert
  with check (true);

create policy "Allow all updates on series"
  on series for update
  using (true);

create policy "Allow all deletes on series"
  on series for delete
  using (true);

create policy "Allow all inserts on panels"
  on panels for insert
  with check (true);

create policy "Allow all updates on panels"
  on panels for update
  using (true);

create policy "Allow all deletes on panels"
  on panels for delete
  using (true);

-- Storage policies for the panels bucket (run in Supabase dashboard)
-- create policy "Public read panels bucket"
--   on storage.objects for select
--   using (bucket_id = 'panels');
--
-- create policy "Allow uploads to panels bucket"
--   on storage.objects for insert
--   with check (bucket_id = 'panels');
--
-- create policy "Allow deletes from panels bucket"
--   on storage.objects for delete
--   using (bucket_id = 'panels');

-- Trigger to auto-update updated_at on series
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger series_updated_at
  before update on series
  for each row execute function update_updated_at();
