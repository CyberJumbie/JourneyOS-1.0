# Journey OS — Canonical Architecture Decisions
# All resolved production findings + architectural decisions
# Source of truth: tests/fixtures/journey-os-production-bible.html

---

## Three-Hub Invariant (D06 — CANONICAL)

THREE-HUB ontology. The "dual-hub" framing (SubConcept + LearningObjective) from January 2026 is **deprecated**.

| Hub | Node | Role |
|-----|------|------|
| Knowledge | SubConcept | What exists in medicine |
| Pedagogical | SLO | What the curriculum commits to teaching |
| Assessment | USMLE_Subtopic | What the examination will test |

Every AssessmentItem MUST connect all three hubs before entering the practice pool.
Items missing any hub edge are flagged `incomplete` and blocked from student queues.

**Coverage distinction:**
- COVERS_TOPIC (Session→SyllabusTopic) = declared intent
- TEACHES (ContentChunk→SubConcept) = verified evidence
- CoverageRecord = confirmed coverage (TEACHES evidence ≥ 0.65 + ≥ 1 approved item)

---

## D-Series — Definition Drifts

### D01 — SyllabusTopic vs. SubConcept
- **SyllabusTopic**: Faculty-authored topic name from syllabus document. Human authority. Can exist before any lecture is uploaded. Enriched with GROUNDED_IN → StandardTerm after NED.
- **SubConcept**: AI-extracted atomic teachable concept from lecture content. Machine-extracted, LOD-verified. Promoted from :Candidate label after faculty approval in P1 Step 07. Cannot exist without a source ContentChunk.

### D02 — CoverageRecord
Progressive tracker, not binary. Created after the FIRST approved AssessmentItem SOURCED_FROM a ContentChunk TEACHING the SubConcept.
- `coverage_score = min(approved_item_count, 3) / 3.0` (capped at 1.0)
- "Full coverage" = coverage_score = 1.0 = ≥ 3 approved items
- Not created from COVERS_TOPIC chain alone — requires TEACHES evidence + assessment evidence

### D03 — GROUNDED_IN Scope
Points FROM a curriculum entity TO an external LOD entity. Meaning: "this curriculum concept has been verified against this standard term."
- ALWAYS: SubConcept → StandardTerm or SyllabusTopic → StandardTerm
- NEVER: AssessmentItem → GROUNDED_IN (use SOURCED_FROM)
- NEVER: Lecture → GROUNDED_IN (use TEACHES chain)
- The StandardTerm IS the LOD anchor; it never has a GROUNDED_IN edge of its own.

### D04 — ContentChunk Size
Canonical: **150-250 tokens, 30-token overlap, entity-boundary-aligned.**
All prior references to "200-400 tokens, 50-token overlap" are **deprecated**.
Required for: entity boundary preservation, BM25 performance, retrieval precision.

### D05 — Core Generation Model
Canonical: **Claude Sonnet 4** (claude-sonnet-4-20250514) for core item generation and critique gate.
**Claude Haiku 4.5** for distractors, rationale, QA scoring, HyDE pre-call, LOD brief, LCME classify.
- Any reference to "Opus for stem generation" is **deprecated**.
- Cost: Sonnet core ~$0.027/item; full pipeline ~$0.12/item. Opus would be $0.45/item (3.75× budget overrun).

### D07 — TEACHES vs. COVERS_TOPIC
- **COVERS_TOPIC** (Session → SyllabusTopic) = declared curriculum intent from syllabus document. Unverified.
- **TEACHES** (ContentChunk → SubConcept) = lecture-verified content delivery. LOD-confirmed.
- For LCME compliance evidence, **only TEACHES chains** count as verified coverage.

### D08 — EntityResolutionJob Scope
Not orphaned by P1 redesign. P1 Step 05 handles automatic SAME_AS creation for CUI matches with confidence ≥ 0.85.
EntityResolutionJob (Phase 5) handles:
1. SubConcepts with P1 confidence 0.65-0.84 — human review queue
2. Cross-course deduplication
3. Periodic :Deprecated SubConcept cleanup
Batch-mode, not real-time.

### D09 — SLO Direction
Direction: **SLO (child) → CONTRIBUTES_TO → ILO (parent)**
Read: "session learning objectives flow upward to institutional learning outcomes."
```cypher
-- CORRECT
MATCH (slo:SLO)-[:CONTRIBUTES_TO]->(ilo:ILO)

-- BANNED (must return 0)
MATCH (ilo:ILO)-[:CONTRIBUTES_TO]->(slo:SLO) RETURN count(*)
```

### D10 — LOD Scope in Generation
The lod_brief (Source 3) is ALWAYS included in generation context regardless of source_scope setting.
source_scope enum ('syllabus_only'|'lecture_only'|'usmle_only'|'combination') controls LOCAL chunks and STRUCTURED traversal.
LOD is a pre-computed invariant always appended within token budget. No configuration excludes the LOD brief.

### D11 — 8-Layer System
Canonical: **8-layer system** numbered 0-7.
- Layer 0: :Reference scaffold (T-Box, seeded, immutable)
- Layers 1-2: Institutional (Institution, Program, CatalogCourse, Course)
- Layer 3: Content (Lecture, LectureSection, ContentChunk, SyllabusTopic)
- Layer 4: Taxonomy/Frameworks (SubConcept, StandardTerm, ProficiencyVariable, USMLE)
- Layer 5: Assessment (AssessmentItem, Distractor, Rationale, TaskShell)
- Layer 6: Exam (Exam, ExamSection, ExamBlueprint, PracticeCollection)
- Layer 7: Student (Student, StudentMastery, Attempt, RecommendationEvent)

The 4-layer framing from January 2026 is **deprecated**.

### D12 — LOD Brief Storage
lod_brief TEXT stored in Supabase table `subconcept_lod_briefs {subconcept_uuid FK, lod_brief TEXT, generated_at TIMESTAMP}`.
SubConcept node in Neo4j carries only `lod_brief_id UUID` (8 bytes — within skinny nodes <100 bytes limit).
At generation time: Supabase single-key lookup (<5ms).
Any prior code referencing `sc.lod_brief` as Neo4j property is **deprecated**.

---

## C-Series — Critical Production Findings

### C01 — Answer Auto-Save
Every student answer is persisted server-side on selection, not on final submission. `session_answers` table is mutable draft state; `attempts` table is immutable final record. On exam resume after crash, answers restored from `session_answers`. Attempts created atomically on final submit via RPC.

### C02 — Time-Windowed Item Access
Students access assessment item content ONLY during an active exam session. RLS on `assessment_items` checks: student may read ONLY IF an active session (`started_at > now() - 4 hours AND completed_at IS NULL`) exists. Pre-fetching items before exam window is architecturally impossible.

### C03 — Atomic CoverageRecord Increments
Always use atomic Neo4j SET expressions — never read-modify-write.
```cypher
-- CORRECT
SET cr.assessment_count = cr.assessment_count + 1
```
For concurrent approvals, use Supabase advisory lock:
```sql
SELECT pg_advisory_xact_lock(hashtext('coverage:' || subconcept_uuid))
```

### C04 — Dead Letter Queue and Manual Retry
All three pipelines have onFailure handlers that write to `pipeline_dead_letters`. Admin dashboard shows dead letter count with drill-down. Manual retry via `POST /app/api/admin/pipelines/dead-letters/[id]/retry`. Alerts fire for P3 failures or >10 dead letters in 1 hour.

### C05 — Neo4j Tenant Isolation via Wrapper
All queries through `neo4jQuery(cypher, params, ctx)`. Wrapper injects institution_id, validates Cypher accepts `$institution_id`, returns fallback on connection failure. Direct `driver.executeQuery()` banned by ESLint. CI fails on detection.

### C06 — Model Version Pinning
Model strings pinned as exact versioned identifiers in env vars:
- `ANTHROPIC_MODEL_SONNET=claude-sonnet-4-20250514`
- `ANTHROPIC_MODEL_HAIKU=claude-haiku-4-5-20251001`

Verified on startup with test prompt. Every generated item records exact `generation_model`.

### C07 — LOD Brief Versioning and Expiry
`subconcept_lod_briefs` carries `lod_brief_version INT` and `umls_release TEXT`. Quarterly Inngest cron compares releases. SubConcepts with `clinical_consequence_score > 0.7` regenerated first. Briefs > 180 days trigger live UMLS fallback. `lod_brief_history` preserves prior versions.

### C08 — P1 Cleanup on Failure
onFailure handler: marks lecture `status = 'failed'`, emits `journey/pipeline.failed`, cleans orphaned ContentChunks, removes :Candidate SubConcepts from this run. Weekly integrity check for ContentChunks with no TEACHES edges.

### C09 — SAME_AS Cycle Prevention
Before creating SAME_AS A→B, check if B can reach A via SAME_AS traversal (depth 1-5). If cycle: skip and log to `entity_resolution_conflicts`. Direction convention: lower CUI string → higher CUI string.

### C10 — Three-Layer Generation Rate Control
1. **API concurrency**: max 3 concurrent P3 per `faculty_id`
2. **Confirmation gate**: >10 items requires cost estimate confirmation
3. **Daily quota**: max 100 items per faculty per calendar day, tracked in `generation_daily_usage`, configurable via `institution_generation_limits`. HTTP 429 when exceeded.

---

## H-Series — High Priority Findings

### H02 — Item Versioning
`item_versions` table for audit trail. Every edit to an approved item creates a version record with previous stem, correct_answer, distractors snapshot, edit reason, and editor UUID.

### H05 — Per-Student Item and Option Randomization
Deterministic random order seeded by `(student_id + exam_id)` for items, `(student_id + item_id)` for options. Shuffle maps stored in `session_items.option_order`. Correct answer is always UUID, never positional index. Records item version number for legal defensibility.

### H06 — JSON Repair and Per-Item Failure Isolation
`safeJsonParse()` attempts: (1) direct `JSON.parse`, (2) `jsonrepair()` then parse, (3) returns null. All P3 batches use `Promise.allSettled()`. Failed items: status `'generation_failed'`, logged, excluded. Batch with >20% failure rate emits admin alert.

### H11 — Clinical Confidence Tier System
Every AssessmentItem carries `clinical_confidence`:
- `'unverified'` — generated, not yet reviewed
- `'self_verified'` — faculty approved
- `'peer_reviewed'` — second reviewer confirmed (for high clinical_consequence_score items)
- `'expert_reviewed'` — external domain expert confirmed

Blueprint UI shows tier distribution.

### H12 — Prompt Injection Prevention
All lecture content sanitized via `sanitizeForContext()` and wrapped in XML delimiters (`<lecture_content>...</lecture_content>`, `<lod_brief>...</lod_brief>`). Generation prompts begin "Using ONLY the information in `<lecture_content>`..." Applied to ALL P1, P2, P3 prompts.

---

## G-Series — Gaps Resolved

### G01 — MisconceptionCategory Seed
15 seeded nodes covering cardiovascular, renal, pharmacology, neuro, micro, endocrine, pathology, statistics, and clinical reasoning misconceptions. Each carries: name, description, usmle_systems[], example_distractor_pattern, empirical_frequency.

### G02 — TaskShell Library
12 templates across 4 families (diagnosis, mechanism, next_step, test_selection) × 3 templates each. Each carries: concept_family, bloom_range[], lead_in_type, variable_slots[], avg_quality_score.

### G03 — Few-Shot Examples for text2Cypher
5 examples covering USMLE system item counts, student mastery, drug-disease curriculum, SLO assessment gaps, and coverage heatmap queries.

### G04 — LCME Domain Classifier
P1 Step 05b. Claude Haiku classifies each ContentChunk against 20 LCMEContentDomain descriptions. Confidence ≥ 0.70 → COVERS_LCME_DOMAIN edge.

### G05 — LOD Brief Storage
Moved from Neo4j property to Supabase `subconcept_lod_briefs` table. SubConcept carries only `lod_brief_id` UUID FK. See D12.

### G06 — Evidence Grade Weights
```typescript
EVIDENCE_GRADE_WEIGHT = { A: 1.00, B: 0.82, C: 0.65, D: 0.45 }
```
Path confidence = product of edge weights along traversal chain.

### G07 — M3 Clerkship Support
`course_type` property on Course handles 'preclinical' | 'clerkship' | 'advanced'. No separate node type for clerkships.

### G08 — Dual-Write with Reconciliation
Supabase FIRST. Neo4j SECOND. Every dual-write table carries `neo4j_synced_at` + `neo4j_sync_status`. Weekly reconciliation: `journey/sync.reconcile` (Monday 1am).

### G09 — IPEC Competency + CarePhase
4 IPECCompetency nodes (VE, RR, CC, TT) + 5 CarePhase nodes (preventive, acute_care, chronic, rehabilitative, palliative_eol) seeded at Phase 0.

### G10 — HyDE and ECD Corrected Framing
HyDE (Gao et al., 2022) is a retrieval engineering technique. It can be understood through an ECD lens but is NOT an ECD principle — it is a retrieval optimization. Do not assert equivalence.

### G11 — ConceptCluster Sequencing
Deferred to T4. Louvain community detection on SubConcept graph requires critical mass of confirmed nodes.

### G12 — PNS/ANS Anatomy
Peripheral Nervous System (A08.800) added with: Cranial Nerves, Peripheral Nerves, Sympathetic NS, Parasympathetic NS.

### G13 — Event Infrastructure
Inngest ONLY for MVP. 14 events defined with slash notation (`journey/lecture.uploaded`). Kafka removed from MVP — T5+ concern when scale exceeds Inngest overhead (>1,000 simultaneous students).

### G14 — StudyQueue Spaced Retrieval
BKT decay + Pimsleur intervals + IRT information function. Daily 8am Inngest cron generates per-student queue. Priority: (clinical_tier, -p_mastery, review_due_ms).

### G15 — Missing Citations
4 citations added: Bodenreider 2004 (UMLS), Himmelstein 2017 (Hetionet), Gao 2022 (HyDE), Haladyna 2002 (NBME items).

---

## Evidence Grade Weights (G06 — Canonical)

| Grade | Weight | When Applied |
|-------|--------|-------------|
| A | 1.00 | Seeded taxonomy or faculty-verified (ground truth) |
| B | 0.82 | GNN-predicted or post-P2 UMLS verified |
| C | 0.65 | System-inferred before faculty review (P1 cold-start) |
| D | 0.45 | Sparse signal (LOD-only, no curriculum corroboration) |

```typescript
import { EVIDENCE_GRADE_WEIGHT } from '@journey/types/constants'
const pathConfidence = (grades: EvidenceGrade[]): number =>
  grades.reduce((acc, g) => acc * EVIDENCE_GRADE_WEIGHT[g], 1.0);
```

---

## Inngest Infrastructure (G13 — Canonical)

14 events. Inngest only (not Kafka). Three main pipeline functions:
- `journey/lecture.process` — P1 (timeout 15min, retries 3, concurrency 10/faculty)
- `journey/subconcept.enrich` — P2 (timeout 24hr, retries 5, concurrency 5, UMLS throttle 20/s)
- `journey/items.batch-generate` — P3 (timeout 30min, retries 2, concurrency 3/faculty)
- `journey/mastery.update` — BKT (timeout 30s, retries 5, concurrency 100)

Crons: sync-reconcile (Mon 1am), weekly-calibrate (Mon 2am), mastery-analysis (Sun 11pm), rag-evaluation (Fri 3am), studyqueue (daily 8am).
