# E08: Mastery & Practice
# Sprint: W12
# Deliverable: Student takes exam, sees mastery radar, practices weak areas. MVP loop closed.

## Epic Overview
E08 closes the MVP loop: after a student completes an exam (E07), their responses flow through
BKT mastery updates, surface on a mastery radar dashboard, and feed a practice engine that
identifies weak areas and builds personalized study sessions. The epic covers the full mastery
lifecycle: BKT update on every attempt, mastery visualization (radar + timeline), formative
feedback with Haiku-generated "Why Wrong?" explanations, IRT-based practice session building,
weak-area auto-identification, Pimsleur-decay study queue generation, real-time mastery
subscriptions, and weekly IRT 2PL calibration for items with sufficient response data.

Key algorithms: BKT (Corbett & Anderson 1995), IRT 3PL item selection (Birnbaum 1968),
Pimsleur spaced repetition decay (Pimsleur 1967, Ebbinghaus 1885), IRT 2PL calibration (Lord 1980).

## Story Table

| Story | Title | Size | Phase | Deps | Parallelizable | CRITICAL |
|-------|-------|------|-------|------|----------------|----------|
| E08-S01 | BKT mastery update Inngest function | M | 1 | [E07-S08] | NO | NO |
| E08-S02 | Mastery dashboard (radar chart by USMLE system) | M | 2 | [E08-S01] | YES | NO |
| E08-S03 | Mastery timeline + streak visualization | M | 2 | [E08-S01] | YES | NO |
| E08-S04 | Formative results + "Why Wrong?" (Haiku distractor explanation) | M | 3 | [E08-S02] | NO | NO |
| E08-S05 | Practice session builder (IRT information maximization, 5-50 items) | L | 4 | [E08-S04] | NO | NO |
| E08-S06 | Weak areas + one-click drill (p_mastery < 0.5 auto-identified) | M | 4 | [E08-S04] | YES | NO |
| E08-S07 | StudyQueue daily generation (Pimsleur decay + BKT + clinical tier) | M | 5 | [E08-S05] | NO | NO |
| E08-S08 | Mastery Realtime subscription (live p_mastery updates) | S | 5 | [E08-S05] | YES | NO |
| E08-S09 | Weekly calibration cron (IRT 2PL for items with >=30 responses) | M | 6 | [E08-S07] | NO | NO |

## Phase Execution Map

```
Phase 1 ──► E08-S01  BKT mastery update Inngest function                    [sequential · M]
Phase 2 ◆── E08-S02  Mastery dashboard (radar chart by USMLE system)        [parallel · M]
         └── E08-S03  Mastery timeline + streak visualization               [parallel · M]
Phase 3 ──► E08-S04  Formative results + "Why Wrong?" (Haiku)              [sequential · M]
Phase 4 ◆── E08-S05  Practice session builder (IRT info max)               [parallel · L]
         └── E08-S06  Weak areas + one-click drill                         [parallel · M]
Phase 5 ◆── E08-S07  StudyQueue daily generation (Pimsleur decay)          [parallel · M]
         └── E08-S08  Mastery Realtime subscription                        [parallel · S]
Phase 6 ──► E08-S09  Weekly calibration cron (IRT 2PL)                     [sequential · M]
```

## Files Owned (by story -- no overlaps in parallel phases)

### E08-S01
- apps/inngest/functions/mastery-update.ts (NEW)
- packages/ai/src/mastery/bkt.ts (NEW)
- tests/E08/E08-S01.pipeline.test.ts (NEW)

### E08-S02
- features/mastery-tracking/components/MasteryRadarChart.tsx (NEW)
- features/mastery-tracking/hooks/useMasteryDashboard.ts (NEW)
- app/api/mastery/[studentId]/route.ts (NEW)
- tests/E08/E08-S02.api.test.ts (NEW)
- tests/E08/E08-S02.ui.test.ts (NEW)

### E08-S03
- features/mastery-tracking/components/MasteryTimeline.tsx (NEW)
- features/mastery-tracking/hooks/useMasteryHistory.ts (NEW)
- app/api/mastery/[studentId]/history/route.ts (NEW)
- tests/E08/E08-S03.api.test.ts (NEW)
- tests/E08/E08-S03.ui.test.ts (NEW)

### E08-S04
- features/why-wrong/components/WhyWrongPanel.tsx (NEW)
- features/why-wrong/services/WhyWrongService.ts (NEW)
- app/api/items/[id]/why-wrong/route.ts (NEW)
- packages/ai/prompts/why-wrong.md (NEW)
- tests/E08/E08-S04.api.test.ts (NEW)
- tests/E08/E08-S04.ui.test.ts (NEW)

### E08-S05
- features/mastery-tracking/services/PracticeSessionService.ts (NEW)
- features/mastery-tracking/components/PracticeBuilder.tsx (NEW)
- app/api/practice/session/route.ts (NEW)
- tests/E08/E08-S05.api.test.ts (NEW)
- tests/E08/E08-S05.ui.test.ts (NEW)

### E08-S06
- features/mastery-tracking/components/WeakAreasDrill.tsx (NEW)
- features/mastery-tracking/hooks/useWeakAreas.ts (NEW)
- tests/E08/E08-S06.api.test.ts (NEW)
- tests/E08/E08-S06.ui.test.ts (NEW)

### E08-S07
- apps/inngest/functions/cron-studyqueue.ts (NEW)
- features/mastery-tracking/services/StudyQueueService.ts (NEW)
- app/api/practice/queue/route.ts (NEW)
- tests/E08/E08-S07.pipeline.test.ts (NEW)
- tests/E08/E08-S07.api.test.ts (NEW)

### E08-S08
- features/mastery-tracking/hooks/useMasteryRealtime.ts (NEW)
- tests/E08/E08-S08.ui.test.ts (NEW)

### E08-S09
- apps/inngest/functions/cron-weekly-calibrate.ts (NEW)
- tests/E08/E08-S09.pipeline.test.ts (NEW)

## Inngest Events
- **E08-S01 triggered by:** `journey/attempt.recorded` (from E07-S08)
- **E08-S01 emits:** `journey/mastery.updated`
- **E08-S07:** `journey/studyqueue.generate` (daily 8am cron via `"cron": "0 8 * * *"`)
- **E08-S09:** `journey/cron.weekly-calibrate` (Monday 2am via `"cron": "0 2 * * 1"`)

## Canonical Rules in Play
- **Rule 2 (H06):** safeJsonParse for Haiku "Why Wrong?" responses in E08-S04
- **Rule 3 (AP-03):** Promise.allSettled for batch mastery updates in E08-S01
- **Rule 4 (D05):** HAIKU_MODEL for Why Wrong explanations — SONNET_MODEL not used in E08
- **Rule 5 (H12):** sanitizeForContext for item content passed to Why Wrong prompt
- **Rule 6 (G08):** Supabase-first dual-write for concept_mastery records
- **Rule 11 (C03):** Atomic concept_mastery updates — never read-modify-write
- **Data Layer:** clean up Realtime subscriptions in useEffect return (E08-S08)

## Success Criteria
- [ ] BKT mastery updates fire on every `journey/attempt.recorded` event
- [ ] p_mastery values are clamped to [0.001, 0.999] and never NaN
- [ ] Mastery radar chart displays per-USMLE-system mastery for authenticated student
- [ ] Mastery timeline shows historical p_mastery progression with streak count
- [ ] "Why Wrong?" panel explains each distractor using Haiku via safeJsonParse
- [ ] Practice session builder selects 5-50 items via IRT Fisher information maximization
- [ ] Weak areas auto-identified where p_mastery < 0.5, one-click drill launches practice
- [ ] StudyQueue generated daily at 8am via Pimsleur decay + BKT + clinical tier priority
- [ ] Realtime subscription pushes live p_mastery updates to connected clients
- [ ] Weekly calibration recalculates IRT 2PL parameters for items with >=30 responses
- [ ] All Haiku calls use HAIKU_MODEL constant, never hardcoded model strings
- [ ] concept_mastery updates are atomic (SET cr.x = cr.x + 1 pattern)
