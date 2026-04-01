# E05: P3 Generation Pipeline
# Sprint: W8-9 (~2 weeks)
# Deliverable: Faculty spec → 30 NBME-quality items for $3.60 in 3 min.

## Epic Overview
E05 builds the complete P3 (Pipeline Phase 3) assessment item generation system. A faculty
member defines a generation spec through the Quick Spec Wizard, which triggers an Inngest
pipeline that assembles HyDE context from 4 sources, generates NBME-quality stems via Sonnet,
critiques them through a max-2-retry gate, generates misconception-anchored distractors via
Haiku, produces Toulmin-chain rationales with QA scoring, writes provenance + 9 classification
edges, and lands items in a faculty approval queue. Post-approval triggers CoverageRecord
atomic updates and BKT initialization.

Pipeline: `journey/items.batch-generate` (timeout 30min, retries 2, concurrency 3/faculty)
Cost target: $0.12/item ($3.60 for 30 items)

## Story Table

| Story | Title | Size | Phase | Deps | Parallelizable | CRITICAL |
|-------|-------|------|-------|------|----------------|----------|
| E05-S01 | Inngest P3 scaffold + step skeleton | S | 1 | [E01-S03, E04-S06] | NO | NO |
| E05-S02 | Quick Spec Wizard UI (faculty defines spec, max 10 turns) | M | 2 | [E05-S01] | YES | NO |
| E05-S03 | ECD Stages 1-3 (ProficiencyVariable → evidence rules → TaskShell selection) | M | 2 | [E05-S01] | YES | NO |
| E05-S04 | P3 Step 01: HyDE context assembly (4-source: LOCAL 3000t, STRUCTURED 800t, LOD 500t, GLOBAL 400t) | L | 3 | [E05-S03] | NO | NO |
| E05-S05 | P3 Step 02-03: Core generation (Sonnet) + critique gate (max 2 retries) | L | 4 | [E05-S04] | NO | NO |
| E05-S06 | P3 Step 04: Distractor generation (Haiku, MisconceptionCategory-anchored) | M | 5 | [E05-S05] | YES | NO |
| E05-S07 | P3 Step 05: Rationale + QA scoring + Toulmin chain | M | 5 | [E05-S05] | YES | NO |
| E05-S08 | P3 Step 06: Provenance write + 9 classification edges | M | 6 | [E05-S06, E05-S07] | NO | NO |
| E05-S09 | Faculty approval gate + post-approval (CoverageRecord, BKT init) | M | 7 | [E05-S08] | NO | YES (C03, C10) |
| E05-S10 | Item review UI + component editor + Toulmin panel | L | 7 | [E05-S08] | YES | NO |

## Phase Execution Map

```
Phase 1 ──► E05-S01  Inngest P3 scaffold + step skeleton                  [sequential · S]
Phase 2 ◆── E05-S02  Quick Spec Wizard UI                                 [parallel · M]
         └── E05-S03  ECD Stages 1-3                                       [parallel · M]
Phase 3 ──► E05-S04  HyDE context assembly (4-source)                     [sequential · L]
Phase 4 ──► E05-S05  Core generation (Sonnet) + critique gate             [sequential · L]
Phase 5 ◆── E05-S06  Distractor generation (Haiku)                        [parallel · M]
         └── E05-S07  Rationale + QA scoring + Toulmin chain              [parallel · M]
Phase 6 ──► E05-S08  Provenance write + 9 classification edges           [sequential · M]
Phase 7 ◆── E05-S09  Faculty approval gate + post-approval               [parallel · M · CRITICAL C03,C10]
         └── E05-S10  Item review UI + component editor + Toulmin panel   [parallel · L]
```

## Files Owned (by story -- no overlaps in parallel phases)

### E05-S01
- apps/inngest/functions/p3-batch-generate.ts (NEW)

### E05-S02
- app/(faculty)/courses/[id]/generate/page.tsx (NEW)
- features/item-generation/components/SpecWizard.tsx (NEW)
- features/item-generation/hooks/useSpecWizard.ts (NEW)
- app/api/generation/spec/route.ts (NEW)

### E05-S03
- apps/inngest/functions/p3-steps/ecd-stages.ts (NEW)

### E05-S04
- apps/inngest/functions/p3-steps/hyde-context-assembly.ts (NEW)
- packages/ai/retrieval/rrf.ts (MODIFY)

### E05-S05
- apps/inngest/functions/p3-steps/generate-core.ts (NEW)
- apps/inngest/functions/p3-steps/critique-gate.ts (NEW)
- packages/ai/prompts/nbme-system.md (NEW)
- packages/ai/prompts/critique-gate.md (NEW)

### E05-S06
- apps/inngest/functions/p3-steps/generate-distractors.ts (NEW)
- packages/ai/prompts/distractor.md (NEW)

### E05-S07
- apps/inngest/functions/p3-steps/rationale-qa.ts (NEW)
- packages/ai/prompts/rationale.md (NEW)

### E05-S08
- apps/inngest/functions/p3-steps/provenance-write.ts (NEW)

### E05-S09
- apps/inngest/functions/p3-steps/faculty-approval-gate.ts (NEW)
- apps/inngest/functions/p3-steps/post-approval.ts (NEW)

### E05-S10
- app/(faculty)/items/[id]/page.tsx (NEW)
- features/item-generation/components/ItemReviewCard.tsx (NEW)
- features/item-generation/components/ToulminPanel.tsx (NEW)
- features/item-generation/components/ComponentEditor.tsx (NEW)

## Inngest Events
- **Triggered by:** `journey/generation.spec-confirmed`
- **Step 06 waitForEvent:** `journey/items.batch-reviewed` (timeout 30d)
- **Post-approval emits:** `journey/items.approved`
- **Rate control (C10):** 3 concurrent/faculty, cost confirm >10 items, 100/day quota

## Canonical Rules in Play
- **Rule 2 (H06):** safeJsonParse for ALL Claude responses -- JSON.parse is BANNED (AP-02)
- **Rule 3:** Promise.allSettled for batch Claude calls -- Promise.all is BANNED (AP-03)
- **Rule 4 (D05):** SONNET_MODEL for core+critique, HAIKU_MODEL for distractors/rationale/QA (AP-04)
- **Rule 5 (H12):** sanitizeForContext + buildContextBlock for all prompts (AP-05)
- **Rule 6 (G08):** Supabase-first dual-write in provenance step
- **Rule 11 (C03):** Atomic CoverageRecord SET -- never read-modify-write (AP-10)
- **AP-12:** Inline LLM prompts BANNED -- use loadPrompt from packages/ai/prompts/

## Success Criteria
- [ ] Faculty can define a generation spec through Quick Spec Wizard (max 10 conversational turns)
- [ ] Pipeline generates 30 NBME-quality items in under 3 minutes
- [ ] Total cost per batch of 30 items is at or below $3.60 ($0.12/item)
- [ ] Every item connects all three hubs (SubConcept + SLO + USMLE_Subtopic) before entering practice pool
- [ ] Critique gate rejects items that fail NBME quality standards (max 2 retries)
- [ ] Distractors are anchored to MisconceptionCategory nodes
- [ ] Each item has a Toulmin chain rationale + QA score
- [ ] 9 classification edges written per item in provenance step
- [ ] CoverageRecord updates are atomic (no read-modify-write)
- [ ] Faculty can review, edit components, and approve/reject items through the review UI
- [ ] Post-approval triggers BKT initialization for approved items
- [ ] Rate limiting enforced: 3 concurrent/faculty, cost confirm >10 items, 100/day quota
