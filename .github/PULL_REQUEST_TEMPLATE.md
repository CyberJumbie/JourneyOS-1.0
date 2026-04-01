## Summary
<!-- One sentence: what does this PR implement? -->

## Related story
Context packet: `.context/epics/EXX/EXX-SXX.md`
Story ID: JRNOS-EXX-SXX

## User verified
<!-- Paste the user's exact confirmation message from /qa here -->

## Canonical decisions checklist
<!-- These are not style choices — they are correctness requirements. PR blocked until all ✓ -->
- [ ] All Neo4j queries use `neo4jQuery()` — no raw driver (Rule 1 / C05 / AP-01)
- [ ] All Claude responses use `safeJsonParse()` — no raw JSON.parse (Rule 2 / AP-02)
- [ ] Batch Claude calls use `Promise.allSettled()` — not Promise.all (Rule 3 / AP-03)
- [ ] No hardcoded model strings — uses SONNET_MODEL / HAIKU_MODEL constants (Rule 4 / AP-04)
- [ ] All lecture content uses `sanitizeForContext()` before LLM prompts (Rule 5 / AP-05)
- [ ] Supabase written before Neo4j — dual-write order maintained (Rule 6 / G08 / AP-06)
- [ ] LOD brief stored in Supabase `subconcept_lod_briefs` — not Neo4j node property (Rule 7 / AP-07)
- [ ] SLO direction: `SLO -[:CONTRIBUTES_TO]→ ILO` — not reversed (Rule 8 / AP-08)
- [ ] TEACHES edges include `evidence_grade` + `evidence_weight` properties (Rule 9 / AP-09)
- [ ] CoverageRecord updated with atomic SET — not read-modify-write (Rule 11 / AP-10)
- [ ] Chunk size within 150-250 tokens (Rule 12 / AP-13)
- [ ] No cross-feature internal imports — uses feature's index.ts public API (Atomic Rule)
- [ ] No hand-written interfaces duplicating database schema (Data Layer / AP-16)
- [ ] Multi-table operations use `supabase.rpc()` — not sequential inserts (AP-17)

## Migrations
- [ ] Yes, migration applied to staging before this PR / [ ] No schema changes

## Type generation
- [ ] Yes, ran `pnpm db:types` after migration / [ ] No schema changes

## New LLM prompts
- [ ] Yes, committed to `packages/ai/prompts/` — not inline / [ ] No new prompts

## gstack checks
- [ ] `/validate` passed (0 TypeScript errors, 0 ESLint violations, all Playwright tests green)
- [ ] `/qa` confirmed by user (message above)
