/**
 * @journey/db — Barrel export for the database package.
 *
 * Import paths:
 *   '@journey/db'            — types + BaseRepository
 *   '@journey/db/client'     — Row<>, Insert<>, Update<>, convenience aliases
 *   '@journey/db/server'     — createServerClient(), createServiceClient()
 *   '@journey/db/browser'    — createBrowserClient()
 */

// Type helpers (Row<'table'>, Insert<'table'>, etc.)
export type {
  Database,
  TableName,
  Row,
  Insert,
  Update,
  AssessmentItemRow,
  AttemptRow,
  ContentChunkRow,
  DistractorRow,
  ExamRow,
  ExamBlueprintRow,
  FacultyProfileRow,
  InstitutionRow,
  LectureRow,
  LectureSectionRow,
  MasterySnapshotRow,
  SessionRow,
  StudentProfileRow,
  SubconceptRow,
  SubconceptLodBriefRow,
} from './client'

// Base repository (dual-write pattern)
export { BaseRepository } from './BaseRepository'
export type { Neo4jSyncResult, Neo4jSyncCallback, BaseRepositoryOptions } from './BaseRepository'
