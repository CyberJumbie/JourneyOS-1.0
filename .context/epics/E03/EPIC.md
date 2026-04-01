# E03: P1 Ingestion Pipeline
# Sprint: W5-7 (~3 weeks)
# Deliverable: Upload lecture → SubConcepts in graph in <5 min.

## Epic Overview
E03 builds the complete P1 ingestion pipeline: a faculty member uploads a PPTX or PDF lecture,
and within 5 minutes Journey OS parses it, extracts entities, links them to the knowledge graph
via TEACHES edges, and presents a faculty review gate before finalizing. The pipeline is an
Inngest function (journey/lecture.process) with timeout 15min, retries 3, concurrency 10/faculty.

Every step follows Supabase-first dual-write (Rule 6), uses neo4jQuery for all graph operations
(Rule 1), and sanitizes all content before sending to Claude (Rule 5). Chunks are 150-250 tokens
with 30-token overlap (Rule 12). TEACHES edges carry evidence_grade:'C', evidence_weight:0.65
(Rule 9). Speaker notes are stored as SpeakerNote nodes, never in ContentChunks (AP-11).

## Story Table

| Story | Title | Size | Phase | Deps | Parallelizable | CRITICAL |
|-------|-------|------|-------|------|----------------|----------|
| E03-S01 | Inngest P1 scaffold (function + step skeleton) | S | 1 | [E01-S03] | NO | NO |
| E03-S02 | P1 Step 01: Parse PPTX/PDF → LectureSection nodes | L | 2 | [E03-S01] | NO | NO |
| E03-S03 | P1 Step 01b: OCR enrichment (Haiku Vision + tesseract fallback) | M | 3 | [E03-S02] | YES | NO |
| E03-S04 | P1 Step 01c: Speaker notes → SpeakerNote nodes (AP-11) | S | 3 | [E03-S02] | YES | NO |
| E03-S05 | P1 Step 03: Graph-aware chunking (150-250 tokens, D04) | M | 3 | [E03-S02] | YES | NO |
| E03-S06 | P1 Step 04: Multi-granularity embedding (MedCPT + text-embedding-3-small) | M | 4 | [E03-S03, E03-S04, E03-S05] | NO | NO |
| E03-S07 | P1 Step 05: Entity extraction (NER + UMLS batch + SAME_AS) | L | 5 | [E03-S06] | NO | NO |
| E03-S08 | P1 Step 05b: LCME domain classification (G04) | M | 5 | [E03-S06] | YES | NO |
| E03-S09 | P1 Step 06: TEACHES edges (BM25 + dense RRF, evidence_grade C) | L | 6 | [E03-S07] | NO | NO |
| E03-S10 | P1 Step 07-08: Faculty review gate + finalize graph | M | 7 | [E03-S09, E03-S08] | NO | YES (C08) |
| E03-S11 | Lecture upload UI + real-time status | M | 7 | [E03-S09] | YES | NO |

## Phase Execution Map

```
Phase 1 ──► E03-S01  Inngest P1 scaffold (function + step skeleton)              [sequential · S]
Phase 2 ──► E03-S02  P1 Step 01: Parse PPTX/PDF → LectureSection nodes          [sequential · L]
Phase 3 ◆── E03-S03  P1 Step 01b: OCR enrichment (Haiku Vision + tesseract)     [parallel · M]
         ├── E03-S04  P1 Step 01c: Speaker notes → SpeakerNote nodes            [parallel · S]
         └── E03-S05  P1 Step 03: Graph-aware chunking (150-250 tokens)          [parallel · M]
Phase 4 ──► E03-S06  P1 Step 04: Multi-granularity embedding                    [sequential · M]
Phase 5 ◆── E03-S07  P1 Step 05: Entity extraction (NER + UMLS + SAME_AS)       [parallel · L]
         └── E03-S08  P1 Step 05b: LCME domain classification                   [parallel · M]
Phase 6 ──► E03-S09  P1 Step 06: TEACHES edges (BM25 + dense RRF)               [sequential · L]
Phase 7 ◆── E03-S10  P1 Step 07-08: Faculty review gate + finalize graph        [parallel · M · CRITICAL C08]
         └── E03-S11  Lecture upload UI + real-time status                       [parallel · M]
```

## Files Owned (by story — no overlaps in parallel phases)

### E03-S01
- apps/inngest/functions/p1-lecture-process.ts (NEW)
- tests/E03/E03-S01.pipeline.test.ts (NEW)

### E03-S02
- apps/inngest/functions/p1-steps/parse-scaffold.ts (NEW)
- sidecars/pptx-renderer/app.py (NEW)
- sidecars/pdf-renderer/app.py (NEW)
- tests/E03/E03-S02.pipeline.test.ts (NEW)

### E03-S03
- apps/inngest/functions/p1-steps/ocr-enrich.ts (NEW)
- packages/ai/prompts/ocr.md (NEW)
- tests/E03/E03-S03.pipeline.test.ts (NEW)

### E03-S04
- apps/inngest/functions/p1-steps/speaker-notes.ts (NEW)
- tests/E03/E03-S04.pipeline.test.ts (NEW)

### E03-S05
- apps/inngest/functions/p1-steps/graph-aware-chunk.ts (NEW)
- packages/ai/chunker.ts (NEW)
- tests/E03/E03-S05.pipeline.test.ts (NEW)

### E03-S06
- apps/inngest/functions/p1-steps/multi-embed.ts (NEW)
- tests/E03/E03-S06.pipeline.test.ts (NEW)

### E03-S07
- apps/inngest/functions/p1-steps/extract-entities.ts (NEW)
- packages/neo4j/same-as.ts (MODIFY — add createSameAsIfSafe)
- tests/E03/E03-S07.pipeline.test.ts (NEW)

### E03-S08
- apps/inngest/functions/p1-steps/lcme-classify.ts (NEW)
- packages/ai/prompts/lcme-classifier.md (NEW)
- tests/E03/E03-S08.pipeline.test.ts (NEW)

### E03-S09
- apps/inngest/functions/p1-steps/teaches-edges.ts (NEW)
- packages/ai/retrieval/rrf.ts (NEW)
- tests/E03/E03-S09.pipeline.test.ts (NEW)

### E03-S10
- apps/inngest/functions/p1-steps/faculty-review-gate.ts (NEW)
- apps/inngest/functions/p1-steps/finalize-graph.ts (NEW)
- tests/E03/E03-S10.pipeline.test.ts (NEW)

### E03-S11
- app/(faculty)/courses/[id]/lectures/page.tsx (NEW)
- features/lecture-ingestion/components/ (NEW — directory)
- features/lecture-ingestion/hooks/useLectureUpload.ts (NEW)
- app/api/lectures/upload/route.ts (NEW)
- app/api/lectures/[id]/status/route.ts (NEW)
- tests/E03/E03-S11.pipeline.test.ts (NEW)

## Inngest Events
- **Triggered by:** `journey/lecture.uploaded` (emitted by upload API route)
- **Step 07 consumes:** `step.waitForEvent('journey/lecture.reviewed', timeout: '7d')`
- **Step 08 emits:** `journey/subconcept.confirmed` (fan-out per approved SubConcept)
- **onFailure:** `journey/pipeline.failed` (dead letter + status update)

## Canonical Rules in Play
- **Rule 1 (C05)**: neo4jQuery for ALL graph writes — wrapper injects institution_id
- **Rule 2 (H06)**: safeJsonParse for all Claude responses in entity extraction + classification
- **Rule 3 (AP-03)**: Promise.allSettled for batch Claude calls (OCR, NER, classification)
- **Rule 4 (D05)**: SONNET_MODEL / HAIKU_MODEL from constants — never hardcoded
- **Rule 5 (H12)**: sanitizeForContext + buildContextBlock for all content → Claude
- **Rule 6 (G08)**: Supabase first, Neo4j second in every pipeline step
- **Rule 9 (G06)**: TEACHES edges MUST carry evidence_grade:'C', evidence_weight:0.65
- **Rule 12 (D04)**: Chunks 150-250 tokens, 30-token overlap, entity-boundary-aligned
- **AP-11**: Speaker notes → SpeakerNote nodes, NEVER in ContentChunks
- **AP-14**: createSameAsIfSafe() for SAME_AS edges

## Success Criteria
- [ ] Faculty uploads a PPTX → pipeline completes in <5 min (Inngest dev dashboard)
- [ ] LectureSection, ContentChunk, SpeakerNote nodes created in Neo4j
- [ ] SubConcepts extracted and linked via TEACHES edges (evidence_grade:'C')
- [ ] LCME domain classification applied to all chunks
- [ ] Faculty review gate blocks finalization until faculty approves
- [ ] Real-time status updates visible in lecture upload UI
- [ ] All Neo4j queries go through neo4jQuery wrapper
- [ ] All Claude responses parsed with safeJsonParse
- [ ] All batch Claude calls use Promise.allSettled
- [ ] `pnpm run validate-seed` still passes after pipeline runs
