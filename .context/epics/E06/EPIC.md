# E06: Coverage & Blueprints
# Sprint: W10-11 (~2 weeks)
# Deliverable: Faculty sees USMLE coverage heatmap, builds blueprint, assembles exam.

## Epic Overview
E06 delivers the coverage-to-exam pipeline for Journey OS. Faculty begin with a live
USMLE coverage heatmap (18 organ systems x 6 Bloom levels, 3-state declared/delivered/confirmed),
then build exam blueprints with Bloom distribution targets, USMLE system proportions,
difficulty bands, and an equity floor (>=15% underrepresented clinical scenarios).
The greedy bin-pack assembly algorithm selects items from the approved pool while
honoring all blueprint constraints and item proximity rules. Assembled exams can be
deployed to students or exported as QTI 2.1 packages. Faculty also get hybrid search
across the item bank and a question remixing workflow for generating variants of
approved items at different Bloom levels or clinical scenarios.

## Story Table

| Story | Title | Size | Phase | Deps | Parallelizable | CRITICAL |
|-------|-------|------|-------|------|----------------|----------|
| E06-S01 | Coverage heatmap API (Neo4j traversal -> 18 systems x 6 Bloom) | L | 1 | [E05-S09] | NO | NO |
| E06-S02 | Coverage heatmap UI (3-state: declared/delivered/confirmed) | M | 2 | [E06-S01] | YES | NO |
| E06-S03 | Blueprint editor (Bloom distribution, USMLE proportions, difficulty, equity >=15%) | M | 2 | [E06-S01] | YES | NO |
| E06-S04 | Exam assembly algorithm (greedy bin-pack, item proximity constraint) | L | 3 | [E06-S03] | NO | NO |
| E06-S05 | Exam deploy + QTI 2.1 export | M | 4 | [E06-S04] | YES | NO |
| E06-S06 | Item search & bank management (hybrid semantic + fulltext + structured) | M | 4 | [E06-S04] | YES | NO |
| E06-S07 | Question remixing (variant generation from approved items) | M | 5 | [E06-S06] | NO | NO |

## Phase Execution Map

```
Phase 1 ──► E06-S01  Coverage heatmap API                             [sequential · L]
Phase 2 ◆── E06-S02  Coverage heatmap UI                              [parallel · M]
         └── E06-S03  Blueprint editor                                 [parallel · M]
Phase 3 ──► E06-S04  Exam assembly algorithm                          [sequential · L]
Phase 4 ◆── E06-S05  Exam deploy + QTI 2.1 export                     [parallel · M]
         └── E06-S06  Item search & bank management                    [parallel · M]
Phase 5 ──► E06-S07  Question remixing                                [sequential · M]
```

## Files Owned (by story — no overlaps in parallel phases)

### E06-S01
- app/api/coverage/heatmap/route.ts (NEW)
- features/coverage-blueprint/services/CoverageReadService.ts (NEW)
- features/coverage-blueprint/repositories/CoverageRepository.ts (NEW)
- features/coverage-blueprint/types.ts (NEW)
- features/coverage-blueprint/index.ts (NEW)
- tests/E06/E06-S01.api.test.ts (NEW)

### E06-S02
- features/coverage-blueprint/components/CoverageHeatmapGrid.tsx (NEW)
- features/coverage-blueprint/components/CoverageHeatmapContainer.tsx (NEW)
- features/coverage-blueprint/hooks/useCoverageHeatmap.ts (NEW)
- tests/E06/E06-S02.ui.test.ts (NEW)

### E06-S03
- features/coverage-blueprint/components/BlueprintEditor.tsx (NEW)
- features/coverage-blueprint/hooks/useBlueprint.ts (NEW)
- app/api/blueprints/route.ts (NEW)
- app/api/blueprints/[id]/route.ts (NEW)
- tests/E06/E06-S03.api.test.ts (NEW)

### E06-S04
- features/coverage-blueprint/services/ExamAssemblyService.ts (NEW)
- app/api/blueprints/[id]/assemble/route.ts (NEW)
- tests/E06/E06-S04.api.test.ts (NEW)

### E06-S05
- app/api/exams/[id]/deploy/route.ts (NEW)
- features/coverage-blueprint/services/QtiExportService.ts (NEW)
- tests/E06/E06-S05.api.test.ts (NEW)

### E06-S06
- features/coverage-blueprint/components/ItemSearchBank.tsx (NEW)
- app/api/items/route.ts (NEW)
- app/api/items/[id]/route.ts (NEW)
- tests/E06/E06-S06.api.test.ts (NEW)

### E06-S07
- app/api/items/[id]/remix/route.ts (NEW)
- features/item-generation/services/RemixService.ts (NEW)
- tests/E06/E06-S07.api.test.ts (NEW)

## Canonical Rules in Play
- **Rule 1 (C05)**: neo4jQuery for all Neo4j reads in CoverageRepository — wrapper injects institution_id
- **Rule 11 (C03)**: CoverageRecord atomic reads — SET cr.assessment_count = cr.assessment_count + 1
- **D02**: CoverageRecord progressive tracker — count/3 capped 1.0
- **D06**: Three-Hub Invariant — items must connect SubConcept + SLO + USMLE_Subtopic before entering practice pool
- **Rule 2 (H06)**: safeJsonParse for all Claude responses in remix variant generation
- **Rule 3**: Promise.allSettled for batch remix calls
- **Rule 4 (D05)**: SONNET_MODEL/HAIKU_MODEL constants for remix generation
- **Rule 5 (H12)**: sanitizeForContext for any lecture content fed into remix prompts
- **Atomic Design**: Heatmap + Blueprint + ItemSearch = organisms in features/coverage-blueprint/components/

## Success Criteria
- [ ] Faculty can view a coverage heatmap showing 18 systems x 6 Bloom levels with 3-state coloring
- [ ] Faculty can create/edit blueprints with Bloom distribution, USMLE proportions, difficulty bands, equity >= 15%
- [ ] Exam assembly algorithm selects items honoring all blueprint constraints + item proximity
- [ ] Assembled exams can be deployed to students or exported as QTI 2.1
- [ ] Faculty can search the item bank with hybrid semantic + fulltext + structured filters
- [ ] Faculty can generate variants of approved items at different Bloom/scenario combinations
- [ ] All Neo4j queries go through neo4jQuery wrapper
- [ ] CoverageRecord updates are atomic (no read-modify-write)
- [ ] All items in assembled exams connect all three hubs (SubConcept + SLO + USMLE_Subtopic)
