/**
 * scripts/seeds/07-ipec-care-phase.ts
 *
 * Seeds IPEC Core Competency domains + sub-competencies and CarePhase nodes
 * into Neo4j. Reads from canonical fixture files:
 *   - tests/fixtures/frameworks/ipec-competencies.json
 *   - tests/fixtures/frameworks/care-phases.json
 *
 * Node types:
 *   IPEC_Competency     — uuid, code, name, description, institution_id
 *   IPEC_SubCompetency  — uuid, code, title, domain_code, institution_id
 *   Edge: IPEC_Competency -[:HAS_SUBCOMPETENCY]-> IPEC_SubCompetency
 *
 *   CarePhase           — uuid, name, description, ordinal, institution_id
 *
 * Idempotent via MERGE on code + institution_id (or name + institution_id for CarePhase).
 */

import { neo4jQuery } from '@journey/neo4j/client'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

const FIXTURES = resolve(__dirname, '../../tests/fixtures/frameworks')

interface IPECFixture {
  domains: Array<{
    code: string
    name: string
    description: string
    sub_competencies: Array<{
      code: string
      title: string
    }>
  }>
}

interface CarePhaseFixture {
  phases: Array<{
    name: string
    description: string
  }>
}

function loadIPEC(): IPECFixture {
  return JSON.parse(readFileSync(resolve(FIXTURES, 'ipec-competencies.json'), 'utf-8'))
}

function loadCarePhases(): CarePhaseFixture {
  return JSON.parse(readFileSync(resolve(FIXTURES, 'care-phases.json'), 'utf-8'))
}

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedIPECAndCarePhase(): Promise<void> {
  const institutionId = process.env.INSTITUTION_ID ?? 'msm-default'
  const ctx = { institution_id: institutionId }

  // ---- IPEC Competencies ----
  const ipec = loadIPEC()
  console.log('[seed:07] Seeding IPEC competency domains and sub-competencies from fixture...')

  for (const domain of ipec.domains) {
    // MERGE domain node
    await neo4jQuery(
      `MERGE (c:IPEC_Competency {code: $code, institution_id: $institution_id})
       ON CREATE SET
         c.uuid = $uuid,
         c.name = $name,
         c.description = $description
       ON MATCH SET
         c.name = $name,
         c.description = $description`,
      {
        code: domain.code,
        uuid: randomUUID(),
        name: domain.name,
        description: domain.description,
      },
      ctx
    )

    // MERGE each sub-competency and edge
    for (const sub of domain.sub_competencies) {
      await neo4jQuery(
        `MERGE (sc:IPEC_SubCompetency {code: $subCode, institution_id: $institution_id})
         ON CREATE SET
           sc.uuid = $uuid,
           sc.title = $title,
           sc.domain_code = $domainCode
         ON MATCH SET
           sc.title = $title,
           sc.domain_code = $domainCode
         WITH sc
         MATCH (c:IPEC_Competency {code: $domainCode, institution_id: $institution_id})
         MERGE (c)-[:HAS_SUBCOMPETENCY]->(sc)`,
        {
          subCode: sub.code,
          uuid: randomUUID(),
          title: sub.title,
          domainCode: domain.code,
        },
        ctx
      )
    }
  }

  const totalSubs = ipec.domains.reduce(
    (sum, d) => sum + d.sub_competencies.length,
    0
  )
  console.log(
    `[seed:07] IPEC done — ${ipec.domains.length} domains, ${totalSubs} sub-competencies`
  )

  // ---- CarePhase nodes ----
  const carePhases = loadCarePhases()
  console.log('[seed:07] Seeding CarePhase nodes from fixture...')

  for (let i = 0; i < carePhases.phases.length; i++) {
    const phase = carePhases.phases[i]
    await neo4jQuery(
      `MERGE (cp:CarePhase {name: $name, institution_id: $institution_id})
       ON CREATE SET
         cp.uuid = $uuid,
         cp.description = $description,
         cp.ordinal = $ordinal
       ON MATCH SET
         cp.description = $description,
         cp.ordinal = $ordinal`,
      {
        name: phase.name,
        uuid: randomUUID(),
        description: phase.description,
        ordinal: i + 1,
      },
      ctx
    )
  }

  console.log(`[seed:07] CarePhase done — ${carePhases.phases.length} phases`)
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  seedIPECAndCarePhase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed:07] FAILED:', err)
      process.exit(1)
    })
}
