# E04: P2 Enrichment Pipeline
# Sprint: W8
# Deliverable: Confirmed SubConcept → fully enriched with LOD + StandardTerm + ProficiencyVariable.

## Epic Overview
E04 builds the P2 Enrichment Pipeline — the second stage of Journey OS's content processing
system. When a SubConcept is confirmed (event: journey/subconcept.confirmed), the P2 pipeline
resolves it against UMLS for standardized terminology, links anatomy/disease relationships,
imports HetioNet neighborhood data, generates LOD briefs via Haiku, creates cross-lecture
links, establishes ECD ProficiencyVariables, and optionally triggers GNN retraining.

Pipeline: `journey/subconcept.enrich` (timeout 24hr, retries 5, concurrency 5, UMLS throttle 20/s)

## Story Table

| Story | Title | Size | Phase | Deps | Parallelizable | CRITICAL |
|-------|-------|------|-------|------|----------------|----------|
| E04-S01 | Inngest P2 scaffold + step skeleton | S | 1 | [E01-S03, E03-S10] | NO | NO |
| E04-S02 | P2 Step 01: UMLS full resolution → StandardTerm + GROUNDED_IN | M | 2 | [E04-S01] | NO | NO |
| E04-S03 | P2 Step 02: Anatomy/disease routing by semantic_type | M | 3 | [E04-S02] | YES | NO |
| E04-S04 | P2 Step 03: HetioNet 2-hop import (max 10 nodes/type) | M | 3 | [E04-S02] | YES | NO |
| E04-S05 | P2 Step 04: LOD brief generation (Haiku, ~200 tokens, Supabase storage) | M | 4 | [E04-S03, E04-S04] | NO | YES (C07) |
| E04-S06 | P2 Step 05-06: Cross-lecture linking + ProficiencyVariable creation (ECD) | M | 5 | [E04-S05] | NO | NO |
| E04-S07 | P2 Step 07: GNN retrain check + weekly reconciliation cron | S | 6 | [E04-S06] | NO | NO |

## Phase Execution Map

```
Phase 1 ──► E04-S01  Inngest P2 scaffold + step skeleton               [sequential · S]
Phase 2 ──► E04-S02  UMLS full resolution → StandardTerm + GROUNDED_IN [sequential · M]
Phase 3 ◆── E04-S03  Anatomy/disease routing by semantic_type           [parallel · M]
         └── E04-S04  HetioNet 2-hop import (max 10 nodes/type)         [parallel · M]
Phase 4 ──► E04-S05  LOD brief generation (Haiku, Supabase storage)     [sequential · M · CRITICAL C07]
Phase 5 ──► E04-S06  Cross-lecture linking + ProficiencyVariable (ECD)   [sequential · M]
Phase 6 ──► E04-S07  GNN retrain check + weekly reconciliation cron     [sequential · S]
```

## Files Owned (by story — no overlaps in parallel phases)

### E04-S01
- apps/inngest/functions/p2-subconcept-enrich.ts (NEW)

### E04-S02
- apps/inngest/functions/p2-steps/umls-resolve.ts (NEW)

### E04-S03
- apps/inngest/functions/p2-steps/anatomy-disease-link.ts (NEW)

### E04-S04
- apps/inngest/functions/p2-steps/hetionet-import.ts (NEW)

### E04-S05
- apps/inngest/functions/p2-steps/lod-brief-generate.ts (NEW)
- packages/ai/prompts/lod-brief.md (NEW)

### E04-S06
- apps/inngest/functions/p2-steps/cross-lecture-link.ts (NEW)
- apps/inngest/functions/p2-steps/proficiency-variable.ts (NEW)

### E04-S07
- apps/inngest/functions/p2-steps/gnn-retrain-check.ts (NEW)
- apps/inngest/functions/cron-sync-reconcile.ts (NEW)

## Inngest Events
- **Triggered by**: `journey/subconcept.confirmed` (emitted by P1 pipeline at end of E03)
- **Step 07 conditionally emits**: `journey/gnn.retrain-trigger` (if >100 new confirmed SubConcepts)
- **Cron**: `journey/sync.reconcile` (Monday 1am — weekly Neo4j reconciliation)

## Canonical Rules in Play
- **Rule 1 (C05)**: neo4jQuery for all Neo4j writes — wrapper injects institution_id
- **Rule 6 (G08)**: Supabase-first dual-write — Neo4j failure never blocks the user
- **Rule 7 (G05/D12)**: LOD briefs in Supabase `subconcept_lod_briefs` table, NOT as Neo4j property
- **Rule 9**: Evidence grade B (0.82) for post-P2 UMLS-verified TEACHES edges
- **Rule 10 (D03)**: GROUNDED_IN only SubConcept→StandardTerm (LOD verification scope)
- **AP-07**: lod_brief as Neo4j property is BANNED — use lod_brief_id FK only
- **AP-14**: SAME_AS cycle prevention via createSameAsIfSafe()
- **Rule 2 (H06)**: safeJsonParse for all Claude responses
- **Rule 3**: Promise.allSettled for batch Claude calls
- **Rule 4 (D05)**: HAIKU_MODEL constant for LOD brief generation
- **Rule 5 (H12)**: sanitizeForContext + buildContextBlock for all LLM prompts

## Scholarly + DS&A References
- **E04-S02**: Bodenreider 2004 (UMLS integration); Trie (UMLS autocomplete)
- **E04-S04**: Himmelstein 2017 (Hetionet); BFS 2-hop neighborhood import O(V+E)
- **E04-S05**: LRU Cache (LOD facts, 1000 entries, O(1) get/put)
- **E04-S06**: Mislevy 2003 (ECD — ProficiencyVariable maps 1:1 to SubConcept)

## Success Criteria
- [ ] `journey/subconcept.confirmed` event triggers P2 pipeline end-to-end
- [ ] SubConcepts enriched with StandardTerm nodes + GROUNDED_IN edges
- [ ] Evidence grade upgraded to B (0.82) on UMLS-verified edges
- [ ] Anatomy/disease routing creates correct typed relationships
- [ ] HetioNet 2-hop import capped at 10 nodes/type per SubConcept
- [ ] LOD briefs stored in Supabase `subconcept_lod_briefs` (NOT Neo4j property)
- [ ] ProficiencyVariable nodes created 1:1 per SubConcept (ECD)
- [ ] Cross-lecture SAME_AS links created with cycle prevention
- [ ] GNN retrain trigger fires when >100 new confirmed SubConcepts
- [ ] Weekly reconciliation cron re-syncs failed Neo4j writes
- [ ] Pipeline respects: 24hr timeout, 5 retries, concurrency 5, UMLS 20/s throttle
