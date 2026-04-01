# Journey OS — Inngest Events (All 14)
# All events use journey/ namespace prefix

## Pipeline trigger events
journey/lecture.uploaded        { lectureId, facultyId, filePath, catalogCourseId, institutionId }
journey/subconcept.confirmed    { subConceptUuid, lectureId, institutionId, facultyId }
journey/items.batch-requested   { specId, subConceptUuids[], facultyId, institutionId, count }

## Pipeline internal events
journey/lecture.reviewed        { lectureId, facultyId, approvedUuids[], rejectedUuids[] }  -- resolves waitForEvent
journey/item.approved           { itemUuid, facultyId, institutionId }                       -- resolves waitForEvent
journey/item.rejected           { itemUuid, facultyId, reason }

## Student events
journey/exam.started            { sessionId, studentId, examId, institutionId }
journey/attempt.submitted       { sessionId, studentId, itemId, optionId, timeMs }
journey/session.completed       { sessionId, studentId, score, institutionId }

## Mastery events
journey/mastery.update          { studentId, subConceptUuid, correct, timeMs, institutionId }
journey/studyqueue.generate     { studentId, institutionId, date }                           -- daily 8am cron

## Maintenance events
journey/sync.reconcile          { institutionId }                                            -- weekly Monday 1am
journey/lod.refresh             { subConceptUuids[], institutionId }                        -- quarterly
journey/medcpt.keepwarm         {}                                                           -- every 10min

## Usage
import { inngest } from '@/packages/inngest/client'
import type { JourneyEvents } from '@journey/types/events'

await inngest.send({ name: 'journey/lecture.uploaded', data: { lectureId, ... } })
