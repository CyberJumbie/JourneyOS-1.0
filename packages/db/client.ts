/**
 * @journey/db/client — Type helpers re-exported from generated types.
 *
 * ALWAYS import Row<'table'>, Insert<'table'>, Update<'table'> from here.
 * NEVER hand-write interfaces duplicating database schema (AP-16).
 *
 * After every migration: pnpm db:types
 */

import type { Database } from './types/database.generated'

// ---------------------------------------------------------------------------
// Row / Insert / Update helpers — the canonical way to reference table types
// ---------------------------------------------------------------------------

/**
 * All table names in the public schema.
 * Resolves to `never` until the migration is applied and `pnpm db:types` is run.
 */
export type TableName = keyof Database['public']['Tables']

export type Row<T extends TableName> =
  Database['public']['Tables'][T]['Row']

export type Insert<T extends TableName> =
  Database['public']['Tables'][T]['Insert']

export type Update<T extends TableName> =
  Database['public']['Tables'][T]['Update']

// ---------------------------------------------------------------------------
// Re-export the full Database type for createClient<Database>() calls
// ---------------------------------------------------------------------------

export type { Database }

// ---------------------------------------------------------------------------
// Convenience aliases for the most-used row types (keep alphabetical)
// These are just aliases — they resolve to Row<'table_name'> which is generated.
//
// NOTE: These will show type errors until the migration is applied and
// `pnpm db:types` regenerates database.generated.ts with real table definitions.
// This is intentional — it ensures we catch schema drift at compile time.
// ---------------------------------------------------------------------------

// @ts-expect-error -- resolves after pnpm db:types (empty Tables until migration applied)
export type AssessmentItemRow = Row<'assessment_items'>
// @ts-expect-error -- resolves after pnpm db:types
export type AttemptRow = Row<'attempts'>
// @ts-expect-error -- resolves after pnpm db:types
export type ContentChunkRow = Row<'content_chunks'>
// @ts-expect-error -- resolves after pnpm db:types
export type DistractorRow = Row<'distractors'>
// @ts-expect-error -- resolves after pnpm db:types
export type ExamRow = Row<'exams'>
// @ts-expect-error -- resolves after pnpm db:types
export type ExamBlueprintRow = Row<'exam_blueprints'>
// @ts-expect-error -- resolves after pnpm db:types
export type FacultyProfileRow = Row<'faculty_profiles'>
// @ts-expect-error -- resolves after pnpm db:types
export type InstitutionRow = Row<'institutions'>
// @ts-expect-error -- resolves after pnpm db:types
export type LectureRow = Row<'lectures'>
// @ts-expect-error -- resolves after pnpm db:types
export type LectureSectionRow = Row<'lecture_sections'>
// @ts-expect-error -- resolves after pnpm db:types
export type MasterySnapshotRow = Row<'mastery_snapshots'>
// @ts-expect-error -- resolves after pnpm db:types
export type SessionRow = Row<'sessions'>
// @ts-expect-error -- resolves after pnpm db:types
export type StudentProfileRow = Row<'student_profiles'>
// @ts-expect-error -- resolves after pnpm db:types
export type SubconceptRow = Row<'subconcepts'>
// @ts-expect-error -- resolves after pnpm db:types
export type SubconceptLodBriefRow = Row<'subconcept_lod_briefs'>
