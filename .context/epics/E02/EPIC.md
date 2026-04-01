# E02: Auth & Admin
# Sprint: W3-4
# Deliverable: Admin can create institution, invite faculty, see dashboard.

## Stories

| Story | Title | Size | Phase | Deps | Parallelizable | CRITICAL |
|-------|-------|------|-------|------|----------------|----------|
| E02-S01 | Supabase Auth + magic link login | M | 1 | [E01-S01] | NO | NO |
| E02-S02 | Institution setup wizard (create institution + first admin) | M | 2 | [E02-S01] | NO | NO |
| E02-S03 | Faculty invitation + onboarding flow | M | 3 | [E02-S02] | YES | NO |
| E02-S04 | Admin dashboard (stats cards + pipeline health) | M | 3 | [E02-S02] | YES | NO |
| E02-S05 | Action queue (severity-scored admin tasks) | S | 3 | [E02-S02] | YES | NO |
| E02-S06 | FERPA audit log viewer (with hash chain verification) | M | 4 | [E02-S04] | YES | NO |
| E02-S07 | Dead letter queue UI + manual retry (C04) | M | 4 | [E02-S04] | YES | YES (C04) |

## Execution Phases

### Phase 1 (sequential)
- E02-S01: Supabase Auth + magic link login

### Phase 2 (sequential)
- E02-S02: Institution setup wizard

### Phase 3 (parallel — 3 worktrees)
- E02-S03: Faculty invitation + onboarding flow
- E02-S04: Admin dashboard (stats cards + pipeline health)
- E02-S05: Action queue (severity-scored admin tasks)

### Phase 4 (parallel — 2 worktrees)
- E02-S06: FERPA audit log viewer (with hash chain verification)
- E02-S07: Dead letter queue UI + manual retry (C04) [CRITICAL]

## Files Owned

### E02-S01
- app/(auth)/login/page.tsx
- app/api/auth/callback/route.ts
- app/api/auth/session/route.ts
- features/auth/

### E02-S02
- app/(admin)/setup/page.tsx
- features/admin/services/InstitutionService.ts
- features/admin/repositories/InstitutionRepository.ts

### E02-S03
- app/(admin)/faculty/page.tsx
- features/admin/services/FacultyService.ts
- app/api/admin/faculty/route.ts

### E02-S04
- app/(admin)/dashboard/page.tsx
- features/admin/components/StatCards.tsx
- features/admin/components/PipelineHealth.tsx
- app/api/admin/stats/route.ts

### E02-S05
- app/(admin)/queue/page.tsx
- features/admin/components/ActionQueue.tsx

### E02-S06
- app/(admin)/audit/page.tsx
- features/admin/components/AuditLogViewer.tsx
- app/api/admin/audit/route.ts

### E02-S07
- app/(admin)/dead-letters/page.tsx
- features/admin/components/DeadLetterQueue.tsx
- app/api/admin/pipelines/dead-letters/route.ts
- app/api/admin/pipelines/dead-letters/[id]/retry/route.ts

## Canonical Rules in Play
- Rule 1 (C05): neo4jQuery for all Neo4j access — wrapper injects institution_id
- Rule 6 (G08): Supabase-first dual-write — Neo4j failure never blocks user
- Data Layer: createServerClient() in API routes, createBrowserClient() in client components
- Data Layer: Row<'table'> from @journey/db/client — never hand-write interfaces
- Data Layer: supabase.rpc() for atomic multi-table operations
- Atomic Design: Pages < 30 lines, organisms in features/, atoms in shared/
- RLS: institution_id scoped — security floor, not ceiling
