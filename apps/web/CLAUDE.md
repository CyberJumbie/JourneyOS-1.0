# apps/web — Next.js 15 App Router (frontend)

## Routing conventions
app/(faculty)/     → faculty routes (requireFacultyRole middleware)
app/(student)/     → student routes (requireStudentRole middleware)
app/(admin)/       → admin routes (requireAdminRole middleware)
app/api/           → route handlers (thin controllers — validate → service → respond)
app/api/test/      → test-only endpoints (return 404 when NODE_ENV === 'production')

## Component import rules (atomic design)
Atoms:     import from '@/shared/components/ui/atoms'
Molecules: import from '@/shared/components/ui/molecules'
Organisms: import from '@/features/[feature]' (public API only)
Templates: import from '@/shared/components/layouts'

NEVER: import from '@/features/[feature]/components' directly from another feature
NEVER: import from '@/features/[feature]/services' or /repositories from pages/components

## Data fetching in App Router
Server Components: createServerClient() + direct service/repository calls
Client Components: SWR or React Query + API route calls
useRealtimeSubscription: browser client only (Supabase Realtime)
Server Actions: for mutations that need RSC invalidation

## Route handler pattern (controller — thin)
1. validateAuth() → get RequestContext
2. validateInput(req) → parsed data (Zod schema)
3. new Service(ctx).method(data) → result
4. NextResponse.json({ data: result })
Error: catch DomainError → toHttpResponse(), catch Error → 500
