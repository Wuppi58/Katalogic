create table if not exists public.katalogic_records (
  -- Kept as vault_id for compatibility; now stores the shared collection UUID.
  vault_id uuid not null,
  item_id uuid not null,
  -- New clients store a JSON record as plain text in payload.
  payload text not null,
  updated_at timestamptz not null,
  primary key (vault_id, item_id)
);

alter table public.katalogic_records enable row level security;

create policy "Katalogic records are readable"
  on public.katalogic_records
  for select
  to anon
  using (true);

create policy "Katalogic records are insertable"
  on public.katalogic_records
  for insert
  to anon
  with check (true);

create policy "Katalogic records are updatable"
  on public.katalogic_records
  for update
  to anon
  using (true)
  with check (true);

grant select, insert, update on public.katalogic_records to anon;
