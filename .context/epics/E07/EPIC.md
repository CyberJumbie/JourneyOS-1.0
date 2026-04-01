# E07: Exam Delivery
# Sprint: W10-11
# Deliverable: Student takes a timed, scrambled, auto-saving exam with ADA accommodations.

## Stories

| Story | Title | Size | Phase | Deps | Parallelizable | CRITICAL |
|-------|-------|------|-------|------|----------------|----------|
| E07-S01 | Student registration + admin approval workflow | M | 1 | [E02-S01] | NO | NO |
| E07-S02 | create_exam_session RPC (atomic session + session_items) | M | 2 | [E06-S04, E07-S01] | NO | YES (C01, AP-17) |
| E07-S03 | Fisher-Yates seeded scramble (HMAC-SHA256 per student) | M | 3 | [E07-S02] | YES | NO |
| E07-S04 | Exam timer + navigation panel (flagging, review) | M | 3 | [E07-S02] | YES | NO |
| E07-S05 | Answer auto-save (session_answers upsert on every selection) | M | 4 | [E07-S03, E07-S04] | NO | YES (C01) |
| E07-S06 | ADA accommodations (time_multiplier, screen reader) | S | 4 | [E07-S03] | YES | NO |
| E07-S07 | Time-windowed RLS on assessment_items (active session only) | M | 5 | [E07-S05] | NO | YES (C02) |
| E07-S08 | Exam submit + attempt creation (submit_exam_session RPC) | M | 6 | [E07-S07] | NO | YES (C01) |

## Execution Phases

### Phase 1 (sequential)
- E07-S01: Student registration + admin approval workflow

### Phase 2 (sequential)
- E07-S02: create_exam_session RPC (atomic session + session_items) [CRITICAL]

### Phase 3 (parallel -- 2 worktrees)
- E07-S03: Fisher-Yates seeded scramble (HMAC-SHA256 per student)
- E07-S04: Exam timer + navigation panel (flagging, review)

### Phase 4 (mixed)
- E07-S05: Answer auto-save (session_answers upsert on every selection) [CRITICAL] — needs both S03+S04
- E07-S06: ADA accommodations (time_multiplier, screen reader) — needs only S03, can run parallel with S05

### Phase 5 (sequential)
- E07-S07: Time-windowed RLS on assessment_items (active session only) [CRITICAL]

### Phase 6 (sequential)
- E07-S08: Exam submit + attempt creation (submit_exam_session RPC) [CRITICAL]

## Files Owned

### E07-S01
- app/(student)/register/page.tsx
- features/auth/services/StudentRegistrationService.ts
- app/api/admin/students/[id]/approve/route.ts
- features/auth/components/StudentRegistrationForm.tsx
- features/auth/components/StudentApprovalList.tsx
- tests/E07/E07-S01.api.test.ts
- tests/E07/E07-S01.ui.test.ts

### E07-S02
- features/exam-delivery/services/ExamSessionService.ts
- packages/db/rpc/create-exam-session.sql
- app/api/exams/[id]/session/route.ts
- features/exam-delivery/repositories/ExamSessionRepository.ts
- features/exam-delivery/types.ts
- features/exam-delivery/index.ts
- tests/E07/E07-S02.api.test.ts

### E07-S03
- features/exam-delivery/services/ScramblerService.ts
- shared/utils/seeded-shuffle.ts
- tests/E07/E07-S03.unit.test.ts

### E07-S04
- features/exam-delivery/components/ExamTimerBar.tsx
- features/exam-delivery/components/ExamNavPanel.tsx
- features/exam-delivery/hooks/useExamSession.ts
- features/exam-delivery/components/ExamQuestionView.tsx
- tests/E07/E07-S04.ui.test.ts

### E07-S05
- features/exam-delivery/hooks/useAutoSave.ts
- app/api/exams/[id]/answer/route.ts
- tests/E07/E07-S05.api.test.ts

### E07-S06
- features/exam-delivery/services/AccommodationService.ts
- features/exam-delivery/hooks/useAccommodations.ts
- tests/E07/E07-S06.api.test.ts

### E07-S07
- packages/db/migrations/0002_time_windowed_rls.sql
- tests/E07/E07-S07.api.test.ts

### E07-S08
- features/exam-delivery/services/ExamSubmitService.ts
- app/api/exams/[id]/submit/route.ts
- packages/db/rpc/submit-exam-session.sql
- tests/E07/E07-S08.api.test.ts

## Canonical Rules in Play
- Rule 1 (C05): neo4jQuery for all Neo4j access — wrapper injects institution_id
- Rule 6 (G08): Supabase-first dual-write — Neo4j failure never blocks user
- C01: Auto-save on EVERY answer selection (session_answers mutable draft)
- C02: Time-windowed RLS — students see items ONLY during active session
- H05: Deterministic scramble seeded by HMAC-SHA256(secret, student_id:exam_id)
- AP-15: Student item access outside session is BANNED
- AP-17: Sequential insert is BANNED — use create_exam_session and submit_exam_session RPCs
- Data Layer: createServerClient() in API routes, createBrowserClient() in client components
- Data Layer: Row<'table'> from @journey/db/client — never hand-write interfaces
- Data Layer: supabase.rpc() for atomic multi-table operations
- Atomic Design: Pages < 30 lines, organisms in features/, atoms in shared/
- RLS: institution_id + student_id scoped — security floor, not ceiling

## Inngest Events
- E07-S02 emits: journey/exam.started
- E07-S08 emits: journey/session.completed
- Each answer triggers: journey/attempt.submitted (but NOT mastery update — that's E08)

## Scholarly + DS&A
- E07-S02: DATA STRUCTURE: Postgres transaction (atomic session creation)
- E07-S03: ALGORITHM: Fisher-Yates seeded shuffle, O(n), HMAC-SHA256 seed, collision < 2^-248
- E07-S05: ALGORITHM: Hash chain (FERPA audit — auto-save events logged)
- E07-S07: DATA STRUCTURE: B-tree index on sessions(student_id, completed_at) for RLS performance
- E07-S08: ALGORITHM: Atomic scoring — score = COUNT(correct) / COUNT(total) x 100
