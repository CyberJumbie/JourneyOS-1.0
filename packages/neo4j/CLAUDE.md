# packages/neo4j — Graph database client

THE ONLY WAY to query Neo4j in Journey OS:
  import { neo4jQuery } from './client'
  await neo4jQuery(cypher, params, ctx)
  ctx = { institution_id: string; actor_id?: string }

BANNED (ESLint error, PR blocked):
  import { driver } from './driver'         ← internal only, not exported
  import { driver } from 'neo4j-driver'     ← never in app code

The wrapper:
  - Injects institution_id from ctx on every query
  - Returns [] on connection error (graceful degradation — never throws)
  - Logs queries in development mode (NODE_ENV=development)
  - Validates institution_id present (warns if missing on non-reference queries)

Reference nodes (global taxonomy — no institution_id needed):
  :BloomLevel :MillerLevel :USMLE_System :USMLE_Topic :USMLE_Subtopic
  :LCMEContentDomain :LCME_Standard :MisconceptionCategory :TaskShell :CarePhase

SAME_AS safety — never create directly:
  import { createSameAsIfSafe } from './same-as'
  // Checks for cycles before creating — prevents infinite traversal

Test-only Neo4j assertions (development/test only):
  POST /app/api/test/cypher with header x-test-mode: true
  Returns 404 in production (NODE_ENV === 'production')
