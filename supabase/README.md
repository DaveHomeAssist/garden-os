# Garden OS online (Supabase)

Project: `garden-os-online` (ref `xzyrmxljzxnthxenbeoq`, us-east-1). Plan: milestone M2.0/M2.1 of the Garden OS MMO plan.

**Status: not applied.** These migrations are for review. Nothing in the live game talks to Supabase yet, and the privacy note at `story-mode/public/privacy.html` is marked *not yet active*.

## What M2.1 adds
| Object | Purpose |
|---|---|
| `public.profiles` | One row per auth user (anonymous included): optional `handle` (3–20 `[A-Za-z0-9_]`, case-insensitive unique, reserved/leetspeak filter), `privacy_accepted_version` |
| `public.cloud_gardens` | Exactly one Free Play garden per user: `schema_version`, `engine_version`, `revision` (optimistic concurrency: each update must send old + 1, else `40001 revision_conflict`), `envelope jsonb` (object, ≤ 256 KB), `checksum`, `client_saved_at` |
| `public.reserved_handles` | Admin-only deny-list (`exact` / `contains`) |
| `public.export_my_data()` | "Download my data": caller's profile + garden as JSON |
| `public.delete_my_account()` | "Delete my account": deletes the caller's `auth.users` row; profile and garden cascade |

RLS: `authenticated` users can select/insert/update/delete **only their own rows**; `anon` has no grants. Timestamps and ids are server-owned (column grants + triggers).

## Tests
- CI (no Docker needed): `cd story-mode && npx vitest run src/test/supabase-rls.test.js` runs the migration in PGlite with a Supabase-shaped `auth` shim and proves A can't read or write B.
- Against a local Supabase stack: `supabase start && supabase test db` runs `supabase/tests/database/*.test.sql` (pgTAP).

## Applying (after review, by an approved operator)
`supabase link --project-ref xzyrmxljzxnthxenbeoq && supabase db push`, or apply the SQL with the Supabase MCP `apply_migration`. Then turn on Anonymous sign-ins and, in M2.1, Google/Discord providers. Don't enable providers until the privacy note is marked active.
