/**
 * Journey OS — Inngest event type definitions
 *
 * All pipeline events are defined here with full type safety.
 * Import these types in Inngest functions and event senders.
 */

/** Event: a lecture file has been uploaded and is ready for ingestion */
export type LectureUploadedData = {
  lecture_id: string
  institution_id: string
  uploaded_by: string
}

/** Event: a pipeline step has completed (success or failure) */
export type PipelineStepCompletedData = {
  step_name: string
  lecture_id: string
  institution_id: string
  status: 'success' | 'failed'
}

/** Event: a Supabase record needs to be synced to Neo4j (Rule 6 dual-write) */
export type Neo4jSyncRequestedData = {
  table: string
  record_id: string
  institution_id: string
  operation: 'create' | 'update' | 'delete'
}

/**
 * All Journey OS Inngest event names.
 * Use these constants instead of string literals.
 */
export const INNGEST_EVENT_NAMES = {
  LECTURE_UPLOADED: 'journey/lecture.uploaded',
  PIPELINE_STEP_COMPLETED: 'journey/pipeline.step.completed',
  NEO4J_SYNC_REQUESTED: 'journey/neo4j.sync.requested',
} as const
