# packages/db — Supabase client and migrations

TYPE GENERATION (run after every migration):
  pnpm db:types       → regenerates packages/db/types/database.generated.ts
  pnpm db:types:check → CI check: fails if committed types differ from schema
  NEVER hand-write interfaces that duplicate database schema (AP-16)

CLIENT VARIANTS:
  createServerClient()  → service_role key — bypasses RLS (server-only: API routes, RSC)
  createBrowserClient() → anon key — RLS-enforced (client components, student exam UI)
  NEVER import server.ts in client components
  NEVER expose service_role key to browser (FERPA violation)

TYPE IMPORTS:
  import type { AssessmentItemRow, SubConceptRow, Row, Insert } from '@journey/db/client'
  Row<'table'> = Database['public']['Tables']['table']['Row']  (generated, always in sync)

DUAL-WRITE (G08 — canonical):
  Supabase FIRST. Neo4j SECOND.
  Every table with KG counterpart: neo4j_synced_at + neo4j_sync_status columns.
  BaseRepository<T> enforces this pattern — extend it, never bypass it.

RLS — the security floor:
  Every user table has RLS. Institution_id scoped on all user queries.
  Students: own data only. Faculty: assigned courses only. Admin: full institution.
  RLS is not optional. App-level filters are extra, not sufficient.

TRANSACTIONS — multi-table atomic operations:
  supabase.rpc('function_name', params)  ← Postgres transaction (AP-17 fix)
  NOT sequential .insert() calls         ← partial success = corrupted state

CONNECTION POOLER:
  SUPABASE_DB_URL (Supavisor) → use for serverless functions
  SUPABASE_DB_DIRECT_URL      → migrations + seeds only (pnpm supabase db push)
