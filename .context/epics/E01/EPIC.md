# E01: Foundation & Infrastructure
# Sprint: W1-2 (~2 weeks)
# Deliverable: Seeded graph, running locally, all infrastructure in place.

## Epic Overview
E01 establishes the complete infrastructure layer for Journey OS: Supabase database with
initial schema, Neo4j Aura with tenant-isolated wrapper, Inngest event system, and all
seed data required for the knowledge graph. By the end of E01, a developer can run the
full stack locally with a populated graph ready for content ingestion (E02+).

## Story Table

| Story | Title | Size | Phase | Deps | Parallelizable | CRITICAL |
|-------|-------|------|-------|------|----------------|----------|
| E01-S01 | Supabase project setup + initial migration | M | 1 | [] | NO | NO |
| E01-S02 | Neo4j Aura setup + neo4jQuery wrapper | M | 1 | [] | YES | YES (C05) |
| E01-S03 | Inngest scaffold + event types | S | 2 | [E01-S01] | NO | NO |
| E01-S04 | Seed: reference nodes (BloomLevel, MillerLevel, SessionType, DifficultyBand, LeadInType, ClinicalSetting, PatientAgeGroup, AssessmentMode, ResourceType) | M | 3 | [E01-S01, E01-S02] | YES | NO |
| E01-S05 | Seed: USMLE taxonomy (18 systems, ~100 topics, ~400 subtopics) | M | 3 | [E01-S01, E01-S02] | YES | NO |
| E01-S06 | Seed: LCME standards + IPEC + CarePhase + anatomy | M | 3 | [E01-S01, E01-S02] | YES | NO |
| E01-S07 | Seed: MisconceptionCategory (15) + TaskShell (12) + few-shot examples | M | 3 | [E01-S01, E01-S02] | YES | NO |
| E01-S08 | Seed: MSM catalog (22 courses) + HetioNet + DrugBank + validate-seed | L | 4 | [E01-S04, E01-S05, E01-S06, E01-S07] | NO | NO |

## Phase Execution Map

```
Phase 1 ◆── E01-S01  Supabase project setup + initial migration    [parallel · M]
         └── E01-S02  Neo4j Aura setup + neo4jQuery wrapper         [parallel · M · CRITICAL C05]
Phase 2 ──► E01-S03  Inngest scaffold + event types                 [sequential · S]
Phase 3 ◆── E01-S04  Seed: reference nodes                         [parallel · M]
         ├── E01-S05  Seed: USMLE taxonomy                         [parallel · M]
         ├── E01-S06  Seed: LCME + IPEC + CarePhase + anatomy      [parallel · M]
         └── E01-S07  Seed: MisconceptionCategory + TaskShell + few-shot [parallel · M]
Phase 4 ──► E01-S08  Seed: MSM catalog + HetioNet + DrugBank + validate [sequential · L]
```

## Files Owned (by story — no overlaps in parallel phases)

### E01-S01
- packages/db/migrations/0001_initial_schema.sql (NEW)
- packages/db/client.ts (NEW)
- packages/db/server.ts (NEW)
- packages/db/browser.ts (NEW)
- packages/db/BaseRepository.ts (NEW)
- .env.example (NEW)

### E01-S02
- packages/neo4j/client.ts (NEW)
- packages/neo4j/driver.ts (NEW)
- packages/neo4j/same-as.ts (NEW)
- packages/neo4j/index.ts (NEW)

### E01-S03
- apps/inngest/client.ts (NEW)
- apps/inngest/functions/index.ts (NEW)
- packages/types/events.ts (NEW)
- app/api/inngest/route.ts (NEW)

### E01-S04
- scripts/seeds/01-reference-nodes.ts (NEW)

### E01-S05
- scripts/seeds/05-usmle-taxonomy.ts (NEW)

### E01-S06
- scripts/seeds/06-lcme-standards.ts (NEW)
- scripts/seeds/07-ipec-care-phase.ts (NEW)
- scripts/seeds/04-anatomy-regions.ts (NEW)

### E01-S07
- scripts/seeds/02-misconception-categories.ts (NEW)
- scripts/seeds/03-task-shells.ts (NEW)
- scripts/seeds/08-few-shot-examples.ts (NEW)

### E01-S08
- scripts/seeds/09-msm-catalog.ts (NEW)
- scripts/seeds/10-hetionet.ts (NEW)
- scripts/seeds/11-drugbank.ts (NEW)
- scripts/seeds/validate-seed.ts (NEW)
- scripts/seeds/dev-seed.ts (NEW)

## Canonical Rules in Play
- **Rule 1 (C05)**: neo4jQuery wrapper — E01-S02 creates it, all seed stories use it
- **Rule 6 (G08)**: Supabase-first dual-write — E01-S01 establishes the pattern
- **Rule 9 (G06)**: Evidence grades on TEACHES edges — seed stories set cold-start C (0.65)
- **AP-01**: Raw neo4j-driver import — E01-S02 must prevent this
- **AP-16**: Hand-written interface — E01-S01 must use generated types
- **AP-17**: Sequential .insert() — E01-S01 RPC functions for atomic ops

## Success Criteria
- [ ] `pnpm dev` starts full stack locally (Next.js + Supabase + Neo4j + Inngest)
- [ ] `pnpm run validate-seed` passes ALL checks
- [ ] Neo4j contains: 9 reference types, 18 systems, ~100 topics, ~400 subtopics, 15 misconception categories, 12 task shells, 22 MSM courses, LCME standards, IPEC competencies, care phases, anatomy regions, HetioNet nodes, DrugBank entries
- [ ] All Neo4j queries go through neo4jQuery wrapper (ESLint rule enforced)
- [ ] Supabase RLS policies active on all tables
- [ ] Inngest dev server running with event types registered
