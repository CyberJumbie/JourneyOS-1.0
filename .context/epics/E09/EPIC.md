# E09: Production Hardening
# Sprint: Post-MVP
# Deliverable: Item analytics, reliability metrics, DIF equity checks, at-risk detection, RAG evaluation.

## Stories

| Story | Title | Size | Phase | Deps | Parallelizable | CRITICAL |
|-------|-------|------|-------|------|----------------|----------|
| E09-S01 | Post-exam item analytics (p-values, discrimination, distractor analysis) | L | 1 | [E08-S09] | NO | NO |
| E09-S02 | KR-20 reliability computation (>=0.70 threshold for high-stakes) | M | 2 | [E09-S01] | YES | NO |
| E09-S03 | Mantel-Haenszel DIF detection (A/B/C classification, equity flags) | M | 2 | [E09-S01] | YES | NO |
| E09-S04 | At-risk student gap classifier (isolated/cluster/systemic via BFS) | M | 3 | [E09-S02, E09-S03] | NO | NO |
| E09-S05 | RAG quality evaluation cron (200-item sample, Friday 3am) | M | 3 | [E09-S01] | YES | NO |
| E09-S06 | Mastery analysis cron (weekly snapshots, BKT slip detection) | M | 3 | [E09-S01] | YES | NO |
| E09-S07 | LCME Readiness Room (coverage + compliance evidence dashboard) | L | 4 | [E09-S04] | NO | NO |

## Execution Phases

### Phase 1 (sequential)
- E09-S01: Post-exam item analytics (p-values, discrimination, distractor analysis)

### Phase 2 (parallel -- 2 worktrees)
- E09-S02: KR-20 reliability computation (>=0.70 threshold for high-stakes)
- E09-S03: Mantel-Haenszel DIF detection (A/B/C classification, equity flags)

### Phase 3 (mixed)
- E09-S04: At-risk student gap classifier (isolated/cluster/systemic via BFS) — needs both S02+S03
- E09-S05: RAG quality evaluation cron (200-item sample, Friday 3am) — needs only S01, can run parallel with S04
- E09-S06: Mastery analysis cron (weekly snapshots, BKT slip detection) — needs only S01, can run parallel with S04

### Phase 4 (sequential)
- E09-S07: LCME Readiness Room (coverage + compliance evidence dashboard)

## Files Owned

### E09-S01
- features/analytics/services/ItemAnalyticsService.ts (NEW)
- features/analytics/components/ItemAnalyticsDashboard.tsx (NEW)
- app/api/admin/analytics/items/route.ts (NEW)
- features/analytics/repositories/ItemAnalyticsRepository.ts (NEW)
- features/analytics/types.ts (NEW)
- features/analytics/index.ts (NEW)
- tests/E09/E09-S01.api.test.ts (NEW)
- tests/E09/E09-S01.ui.test.ts (NEW)

### E09-S02
- features/analytics/services/ReliabilityService.ts (NEW)
- features/analytics/components/KR20Panel.tsx (NEW)
- tests/E09/E09-S02.api.test.ts (NEW)

### E09-S03
- features/analytics/services/DifService.ts (NEW)
- features/analytics/components/EquityPanel.tsx (NEW)
- tests/E09/E09-S03.api.test.ts (NEW)

### E09-S04
- features/analytics/services/AtRiskClassifierService.ts (NEW)
- features/analytics/components/AtRiskDashboard.tsx (NEW)
- tests/E09/E09-S04.api.test.ts (NEW)

### E09-S05
- apps/inngest/functions/cron-rag-evaluation.ts (NEW)
- tests/E09/E09-S05.pipeline.test.ts (NEW)

### E09-S06
- apps/inngest/functions/cron-mastery-analysis.ts (NEW)
- tests/E09/E09-S06.pipeline.test.ts (NEW)

### E09-S07
- app/(admin)/lcme-readiness/page.tsx (NEW)
- features/analytics/components/LcmeReadinessRoom.tsx (NEW)
- app/api/lcme/readiness/route.ts (NEW)
- app/api/lcme/evidence-package/route.ts (NEW)
- tests/E09/E09-S07.api.test.ts (NEW)
- tests/E09/E09-S07.ui.test.ts (NEW)

## Canonical Rules in Play
- Rule 1 (C05): neo4jQuery for all Neo4j access — wrapper injects institution_id
- Rule 6 (G08): Supabase-first dual-write — Neo4j failure never blocks user
- Rule 8 (D09): SLO -[:CONTRIBUTES_TO]-> ILO direction for LCME compliance queries
- D06: Three-Hub Invariant — SubConcept + SLO + USMLE_Subtopic for coverage evidence
- D07: Only TEACHES chains count as verified coverage for LCME
- Rule 3: Promise.allSettled for batch Claude calls in RAG evaluation
- Rule 4 (D05): SONNET_MODEL / HAIKU_MODEL from constants.ts for RAG evaluation
- Rule 5 (H12): sanitizeForContext + buildContextBlock for RAG evaluation prompts
- Data Layer: createServerClient() in API routes, Row<'table'> from @journey/db/client
- Atomic Design: Pages < 30 lines, organisms in features/, atoms in shared/

## Inngest Events
- E09-S05: journey/cron.rag-evaluation (Friday 3am, 200-item stratified sample)
- E09-S06: journey/cron.mastery-analysis (Sunday 11pm, weekly snapshots)

## Scholarly + DS&A
- E09-S01: ALGORITHM: Item discrimination index + p-value computation + distractor analysis, O(n*k) where n=students, k=items
- E09-S02: ALGORITHM: KR-20 reliability, formula: (k/(k-1)) * (1 - sum(pi*qi) / variance), threshold >=0.70 for high-stakes, requires >=10 students; FOUNDATION: Kuder & Richardson 1937, Nunnally 1978
- E09-S03: ALGORITHM: Mantel-Haenszel DIF, MH D-DIF = -2.35 * ln(alpha_MH), ETS A/B/C classification, requires >=50 students; FOUNDATION: Holland & Thayer 1988
- E09-S04: ALGORITHM: At-risk gap classifier, O(V+E) BFS graph scan, three types: systemic/cluster/isolated, weak threshold p_mastery < 0.70
- E09-S05: ALGORITHM: RAG evaluation (context recall, faithfulness, answer correctness), 200-item stratified sample
- E09-S07: DATA STRUCTURE: Coverage bit vector (O(1) set/get, O(n/64) popcount)
