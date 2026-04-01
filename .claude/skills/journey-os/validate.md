# /validate — Automated Validation (runs BEFORE human QA)

STEP 1: Static checks — STOP and fix if any fail (do NOT proceed to /qa with failures):
pnpm tsc --noEmit --strict
pnpm eslint . --max-warnings 0
pnpm test:unit

STEP 2: Canonical violation scan on changed files:
git diff --name-only HEAD | xargs grep -l "neo4j-driver" | grep -v "packages/neo4j/driver.ts"
git diff --name-only HEAD | xargs grep -n "JSON\.parse(" | grep -v "safeJsonParse"
git diff --name-only HEAD | xargs grep -n "Promise\.all(" | grep -v "allSettled"
git diff HEAD | grep -E '^\+.*claude-(sonnet|haiku)' | grep -v constants.ts
Expected: no output for each. Any output = STOP and fix.

STEP 3: Read the AUTOMATED TESTS section from the context packet.
Run those Playwright tests exactly as written:
pnpm playwright test tests/[epic]/[story].[type].test.ts --reporter=list

If AUTOMATED TESTS section is empty: generate appropriate tests based on story type:
- API stories: page.request auth + route call + response assertion + DB state check
- Pipeline stories: trigger Inngest event → waitForStatus → assertNeo4j → Supabase row check
- Seed stories: pnpm run validate-seed (all checks must be ✓)
- UI stories: page.goto + selector assertions matching acceptance criteria

STEP 4: For pipeline stories — trigger via Inngest dev mode:
curl -X POST http://localhost:8288/e/journey/[event-name] -d '[event-data]'
Poll /app/api/[entity]/status until expected status reached (use tests/helpers/pipeline.ts waitForStatus).

STEP 5: Verify database state:
Neo4j: POST /app/api/test/cypher with x-test-mode: true header (read-only MATCH only)
Supabase: GET /app/api/test/supabase?table=[table]&[filter] (returns rows for test verification)
Note: Both test endpoints return 404 in production (NODE_ENV check).

STEP 6: Output validation report before proceeding to /qa:
TypeScript: ✓/✗  |  ESLint: ✓/✗  |  Unit tests: X/X passing
API tests: X/X   |  Pipeline: ✓/✗  |  Neo4j state: ✓/✗  |  Supabase state: ✓/✗
Canonical scan: ✓/✗ (0 violations)
→ READY FOR HUMAN QA  /  → BLOCKED: fix [N] issues first
