// RLS proof for supabase/migrations (M2.1): player A can never read or write player B's rows.
// Runs the real migration SQL in PGlite (Postgres compiled to WASM) against a minimal
// Supabase-shaped auth schema: roles anon/authenticated, auth.users, auth.uid().
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = resolve(__dirname, '../../../supabase/migrations');
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

// Mirrors Supabase: auth.uid() reads the JWT claims PostgREST sets per request.
const SUPABASE_SHIM = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  create table auth.users (
    id uuid primary key,
    is_anonymous boolean not null default true,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  -- Supabase grants table privileges to API roles by default; the migration must revoke them.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

let db;

async function as(uid, fn) {
  const role = uid ? 'authenticated' : 'anon';
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(uid ? { sub: uid, role } : { role }),
    ]);
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
}

async function expectError(promise, pattern) {
  let error = null;
  try { await promise; } catch (err) { error = err; }
  expect(error, `expected an error matching ${pattern}`).not.toBeNull();
  expect(String(error.message)).toMatch(pattern);
}

const envelope = (label) => JSON.stringify({ v: 1, kind: 'free-play', label, grid: [] });

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8'));
  }
}, 60_000);

afterAll(async () => { await db?.close(); });

beforeEach(async () => {
  await db.exec(`
    delete from auth.users;
    insert into auth.users (id) values ('${A}'), ('${B}');
  `);
  await as(A, async (tx) => {
    await tx.query(`insert into public.profiles (id, handle) values ($1, 'Tomato_Ann')`, [A]);
    await tx.query(`insert into public.cloud_gardens (user_id, schema_version, envelope) values ($1, 1, $2)`, [A, envelope('A')]);
  });
  await as(B, async (tx) => {
    await tx.query(`insert into public.profiles (id, handle) values ($1, 'Basil_Bob')`, [B]);
    await tx.query(`insert into public.cloud_gardens (user_id, schema_version, envelope) values ($1, 1, $2)`, [B, envelope('B')]);
  });
});

describe('cloud_gardens RLS', () => {
  it('a player reads only their own garden', async () => {
    const rows = await as(A, (tx) => tx.query(`select user_id, envelope->>'label' as label from public.cloud_gardens`));
    expect(rows.rows).toEqual([{ user_id: A, label: 'A' }]);
    const targeted = await as(A, (tx) => tx.query(`select 1 from public.cloud_gardens where user_id = $1`, [B]));
    expect(targeted.rows).toHaveLength(0);
  });

  it('A cannot update, delete or overwrite B\'s garden', async () => {
    const upd = await as(A, (tx) => tx.query(
      `update public.cloud_gardens set envelope = $2, revision = 2 where user_id = $1`, [B, envelope('hacked')]));
    expect(upd.affectedRows).toBe(0);
    const del = await as(A, (tx) => tx.query(`delete from public.cloud_gardens where user_id = $1`, [B]));
    expect(del.affectedRows).toBe(0);
    await expectError(
      as(A, (tx) => tx.query(`insert into public.cloud_gardens (user_id, schema_version, envelope) values ($1, 1, $2)
        on conflict (user_id) do update set envelope = excluded.envelope, revision = public.cloud_gardens.revision + 1`, [B, envelope('hacked')])),
      /row-level security|violates/i,
    );
    const still = await as(B, (tx) => tx.query(`select revision, envelope->>'label' as label from public.cloud_gardens`));
    expect(still.rows).toEqual([{ revision: 1, label: 'B' }]);
  });

  it('A cannot hand their garden to B or create a second one', async () => {
    await expectError(
      as(A, (tx) => tx.query(`update public.cloud_gardens set user_id = $1, revision = 2 where user_id = $2`, [B, A])),
      /permission denied|row-level security|immutable/i,
    );
    await expectError(
      as(A, (tx) => tx.query(`insert into public.cloud_gardens (user_id, schema_version, envelope) values ($1, 1, $2)`, [A, envelope('dup')])),
      /duplicate key/i,
    );
  });

  it('enforces optimistic revisions', async () => {
    const ok = await as(A, (tx) => tx.query(
      `update public.cloud_gardens set envelope = $2, revision = 2 where user_id = $1 returning revision`, [A, envelope('A2')]));
    expect(ok.rows).toEqual([{ revision: 2 }]);
    await expectError(
      as(A, (tx) => tx.query(`update public.cloud_gardens set envelope = $2, revision = 2 where user_id = $1`, [A, envelope('stale')])),
      /revision_conflict/,
    );
  });

  it('rejects non-object and oversized envelopes', async () => {
    await expectError(
      as(A, (tx) => tx.query(`update public.cloud_gardens set envelope = '[1,2]'::jsonb, revision = 2 where user_id = $1`, [A])),
      /cloud_gardens_envelope_object/,
    );
    const big = JSON.stringify({ v: 1, blob: 'x'.repeat(270_000) });
    await expectError(
      as(A, (tx) => tx.query(`update public.cloud_gardens set envelope = $2, revision = 2 where user_id = $1`, [A, big])),
      /cloud_gardens_envelope_size/,
    );
  });

  it('server owns timestamps', async () => {
    await expectError(
      as(A, (tx) => tx.query(`update public.cloud_gardens set created_at = now() - interval '1 year', revision = 2 where user_id = $1`, [A])),
      /permission denied/i,
    );
  });
});

describe('profiles RLS', () => {
  it('a player reads and edits only their own profile', async () => {
    const rows = await as(A, (tx) => tx.query(`select id, handle from public.profiles`));
    expect(rows.rows).toEqual([{ id: A, handle: 'Tomato_Ann' }]);
    const upd = await as(A, (tx) => tx.query(`update public.profiles set handle = 'Stolen' where id = $1`, [B]));
    expect(upd.affectedRows).toBe(0);
    const del = await as(A, (tx) => tx.query(`delete from public.profiles where id = $1`, [B]));
    expect(del.affectedRows).toBe(0);
    const still = await as(B, (tx) => tx.query(`select handle from public.profiles`));
    expect(still.rows).toEqual([{ handle: 'Basil_Bob' }]);
  });

  it('A cannot create a profile for someone else', async () => {
    await db.exec(`insert into auth.users (id) values ('00000000-0000-4000-8000-00000000000c')`);
    await expectError(
      as(A, (tx) => tx.query(`insert into public.profiles (id) values ('00000000-0000-4000-8000-00000000000c')`)),
      /row-level security/i,
    );
  });

  it('validates handles: format, reserved words, leetspeak, case-insensitive uniqueness', async () => {
    for (const bad of ['ab', 'has space', 'x'.repeat(21), 'Admin', 'xX_4dm1n_Xx', 'G4rden_OS', 'mod']) {
      await expectError(
        as(A, (tx) => tx.query(`update public.profiles set handle = $2 where id = $1`, [A, bad])),
        /handle_not_allowed|profiles_handle_format/,
      );
    }
    await expectError(
      as(A, (tx) => tx.query(`update public.profiles set handle = 'basil_bob' where id = $1`, [A])),
      /duplicate key/i,
    );
    for (const good of ['beetroot', 'model_gardener', 'Sauce_Queen_7']) {
      const res = await as(A, (tx) => tx.query(`update public.profiles set handle = $2 where id = $1 returning handle`, [A, good]));
      expect(res.rows[0].handle).toBe(good);
    }
  });

  it('players cannot read the reserved-handle list', async () => {
    await expectError(as(A, (tx) => tx.query(`select * from public.reserved_handles`)), /permission denied/i);
  });
});

describe('anon role (no session)', () => {
  it('has no access to any table or function', async () => {
    for (const sql of [
      'select * from public.profiles',
      'select * from public.cloud_gardens',
      `insert into public.profiles (id) values ('${A}')`,
      'select public.export_my_data()',
      'select public.delete_my_account()',
    ]) {
      await expectError(as(null, (tx) => tx.query(sql)), /permission denied/i);
    }
  });
});

describe('privacy rights functions', () => {
  it('export_my_data returns only the caller\'s rows', async () => {
    const res = await as(B, (tx) => tx.query(`select public.export_my_data() as data`));
    const data = res.rows[0].data;
    expect(data.user_id).toBe(B);
    expect(data.profile.handle).toBe('Basil_Bob');
    expect(data.cloud_garden.envelope.label).toBe('B');
    expect(JSON.stringify(data)).not.toContain('Tomato_Ann');
  });

  it('delete_my_account removes only the caller, cascading their rows', async () => {
    await as(A, (tx) => tx.query(`select public.delete_my_account()`));
    const users = await db.query(`select id from auth.users order by id`);
    expect(users.rows).toEqual([{ id: B }]);
    const gardens = await db.query(`select user_id from public.cloud_gardens`);
    expect(gardens.rows).toEqual([{ user_id: B }]);
    const profiles = await db.query(`select id from public.profiles`);
    expect(profiles.rows).toEqual([{ id: B }]);
  });
});
