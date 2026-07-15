-- Run this once in the Supabase SQL editor of a fresh project.
-- Then copy the project URL and anon key into site/shared/config.js.

-- Messages table: one row per printed receipt. `code` is the short number
-- carried by the tick strip on the print (1..4095).
create table public.messages (
  id uuid primary key,
  code integer not null unique check (code between 1 and 4095),
  text text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Installation-scale trust model: the anon key may read and insert,
-- nothing may update or delete.
create policy "anon read messages"
  on public.messages for select to anon using (true);

create policy "anon insert messages"
  on public.messages for insert to anon with check (true);

-- Public storage bucket for the rendered receipt PNGs.
insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true);

create policy "anon upload artworks"
  on storage.objects for insert to anon
  with check (bucket_id = 'artworks');

create policy "public read artworks"
  on storage.objects for select
  using (bucket_id = 'artworks');
