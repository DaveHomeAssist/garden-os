-- Garden OS online, milestone M2.1: profiles + one cloud-saved Free Play garden per user.
-- Scope: owner-only access. Nothing here is public; public snapshots and handles come in M2.3.
-- Target: Supabase project garden-os-online. Apply only after review.

-- ---------------------------------------------------------------------------
-- Reserved handles (staff/impersonation terms). The moderation deny-list grows here;
-- it is managed by admins only (no client grants).
-- ---------------------------------------------------------------------------
create table public.reserved_handles (
  term text primary key check (term = lower(term) and length(term) between 2 and 32),
  match text not null default 'exact' check (match in ('exact', 'contains'))
);
alter table public.reserved_handles enable row level security;
revoke all on public.reserved_handles from anon, authenticated;

-- 'contains' blocks the term anywhere (e.g. "xX_admin_Xx"); 'exact' only blocks the whole
-- handle, so garden words like "beetroot" or "model_gardener" stay allowed.
insert into public.reserved_handles (term, match) values
  ('admin', 'contains'), ('moderator', 'contains'), ('official', 'contains'),
  ('gardenos', 'contains'), ('gardenbot', 'contains'), ('gardenerbot', 'contains'),
  ('mixmash', 'contains'), ('grokbot', 'contains'),
  ('mod', 'exact'), ('mods', 'exact'), ('staff', 'exact'), ('support', 'exact'),
  ('system', 'exact'), ('root', 'exact'), ('null', 'exact'), ('undefined', 'exact'),
  ('grok', 'exact'), ('dev', 'exact'), ('developer', 'exact');

-- Normalise a handle for comparison: lowercase, strip underscores, undo common leetspeak.
create function public.normalize_handle(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(replace(lower(raw), '_', ''), '013457', 'oieast');
$$;
revoke all on function public.normalize_handle(text) from public, anon, authenticated;
grant execute on function public.normalize_handle(text) to authenticated;

create function public.handle_is_allowed(raw text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select raw ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (
       select 1 from public.reserved_handles r
       where (r.match = 'exact' and public.normalize_handle(raw) = public.normalize_handle(r.term))
          or (r.match = 'contains' and strpos(public.normalize_handle(raw), public.normalize_handle(r.term)) > 0)
     );
$$;
revoke all on function public.handle_is_allowed(text) from public, anon, authenticated;
grant execute on function public.handle_is_allowed(text) to authenticated;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (anonymous users included).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text,
  privacy_accepted_version integer check (privacy_accepted_version is null or privacy_accepted_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle is null or handle ~ '^[A-Za-z0-9_]{3,20}$')
);
create unique index profiles_handle_unique on public.profiles (lower(handle)) where handle is not null;

-- ---------------------------------------------------------------------------
-- cloud_gardens: exactly one Free Play garden per user.
-- The save itself is an opaque, versioned envelope; the client owns its shape
-- until the M2.2 authority starts verifying it.
-- ---------------------------------------------------------------------------
create table public.cloud_gardens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  schema_version integer not null check (schema_version >= 1),
  engine_version integer not null default 1 check (engine_version >= 1),
  revision bigint not null default 1 check (revision >= 1),
  envelope jsonb not null,
  checksum text check (checksum is null or checksum ~ '^[A-Za-z0-9_-]{1,128}$'),
  client_saved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cloud_gardens_envelope_object check (jsonb_typeof(envelope) = 'object'),
  constraint cloud_gardens_envelope_size check (octet_length(envelope::text) <= 262144)
);

-- ---------------------------------------------------------------------------
-- Triggers: server-owned timestamps, immutable owner ids, handle filter,
-- and optimistic concurrency on cloud_gardens.revision.
-- ---------------------------------------------------------------------------
create function public.profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id then
      raise exception 'profile id is immutable' using errcode = '42501';
    end if;
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;
  if new.handle is not null
     and (tg_op = 'INSERT' or new.handle is distinct from old.handle)
     and not public.handle_is_allowed(new.handle) then
    raise exception 'handle_not_allowed' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

create function public.cloud_gardens_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.revision := 1;
    new.created_at := now();
  else
    if new.user_id <> old.user_id then
      raise exception 'garden owner is immutable' using errcode = '42501';
    end if;
    -- Clients must send revision = (what they last read) + 1. Anything else means
    -- another device saved in between; the client reloads and resolves.
    if new.revision <> old.revision + 1 then
      raise exception 'revision_conflict: expected %, got %', old.revision + 1, new.revision
        using errcode = '40001';
    end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger cloud_gardens_before_write
  before insert or update on public.cloud_gardens
  for each row execute function public.cloud_gardens_before_write();

-- ---------------------------------------------------------------------------
-- Row Level Security: a signed-in user (anonymous or linked) can only see and
-- change their own rows. The anon role (no session) gets nothing.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cloud_gardens enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.cloud_gardens from anon, authenticated;
grant select, insert, delete on public.profiles to authenticated;
grant update (handle, privacy_accepted_version) on public.profiles to authenticated;
grant select, insert, delete on public.cloud_gardens to authenticated;
grant update (schema_version, engine_version, revision, envelope, checksum, client_saved_at)
  on public.cloud_gardens to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_delete_own on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

create policy cloud_gardens_select_own on public.cloud_gardens
  for select to authenticated using (user_id = (select auth.uid()));
create policy cloud_gardens_insert_own on public.cloud_gardens
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy cloud_gardens_update_own on public.cloud_gardens
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy cloud_gardens_delete_own on public.cloud_gardens
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Privacy-note rights: download my data, delete my account.
-- ---------------------------------------------------------------------------
create function public.export_my_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'user_id', auth.uid(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'cloud_garden', (select to_jsonb(g) from public.cloud_gardens g where g.user_id = auth.uid())
  );
$$;
revoke all on function public.export_my_data() from public, anon, authenticated;
grant execute on function public.export_my_data() to authenticated;

-- Deletes the caller's auth user; profiles and cloud_gardens cascade.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
