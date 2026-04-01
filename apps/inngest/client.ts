import { Inngest, eventType, staticSchema } from 'inngest'
import type {
  LectureUploadedData,
  PipelineStepCompletedData,
  Neo4jSyncRequestedData,
} from '@journey/types/events'
import { INNGEST_EVENT_NAMES } from '@journey/types/events'

/**
 * Typed event triggers — use these when defining Inngest functions.
 * Example: inngest.createFunction({ id: '...' }, { event: lectureUploaded }, handler)
 */
export const lectureUploaded = eventType(INNGEST_EVENT_NAMES.LECTURE_UPLOADED, {
  schema: staticSchema<LectureUploadedData>(),
})

export const pipelineStepCompleted = eventType(
  INNGEST_EVENT_NAMES.PIPELINE_STEP_COMPLETED,
  { schema: staticSchema<PipelineStepCompletedData>() },
)

export const neo4jSyncRequested = eventType(
  INNGEST_EVENT_NAMES.NEO4J_SYNC_REQUESTED,
  { schema: staticSchema<Neo4jSyncRequestedData>() },
)

export const inngest = new Inngest({
  id: `journey-os-${process.env.INNGEST_APP_ENV ?? process.env.NODE_ENV ?? 'development'}`,
})
