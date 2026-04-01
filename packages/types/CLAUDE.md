# packages/types — Shared TypeScript types and constants

The type system IS the executable specification.
Types defined here cannot be violated by TypeScript-compliant code.

KEY CONSTANTS (import, never hardcode):
  EVIDENCE_GRADE_WEIGHT  = { A: 1.00, B: 0.82, C: 0.65, D: 0.45 }
  SONNET_MODEL           = 'claude-sonnet-4-20250514'
  HAIKU_MODEL            = 'claude-haiku-4-5-20251001'
  INNGEST_EVENTS         = all 14 typed event names

KEY TYPES:
  EvidenceGrade          = 'A' | 'B' | 'C' | 'D'
  BloomLevelCode         = 1 | 2 | 3 | 4 | 5 | 6
  SubConceptStatus       = 'candidate' | 'confirmed' | 'deprecated'
  NeoSyncStatus          = 'pending' | 'synced' | 'failed'
  ClinicalConfidence     = 'unverified' | 'self_verified' | 'peer_reviewed' | 'expert_reviewed'
  RequestContext         = { institution_id: string; actor_id?: string }
  PipelineStatus         = 'queued' | 'parsing' | 'chunking' | 'enriching' | 'review_pending' | 'confirmed' | 'failed'

RULE: Code used across 2+ packages → add type here.
      Code specific to one package → keep it in that package.
      Never import from @journey/db, @journey/neo4j, or React in this package.
