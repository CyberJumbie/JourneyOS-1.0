/**
 * scripts/seeds/06-lcme-standards.ts
 *
 * Seeds LCME accreditation standards and elements into Neo4j.
 * Reads from tests/fixtures/frameworks/lcme-standards.json (canonical source).
 *
 * Node types:
 *   LCME_Standard  — uuid, code, number, title, summary, institution_id
 *   LCME_Element   — uuid, code, title, summary, standard_code, institution_id
 *   Edge: LCME_Standard -[:HAS_ELEMENT]-> LCME_Element
 *
 * Idempotent via MERGE on code + institution_id.
 */

import { neo4jQuery } from '@journey/neo4j/client'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

const FIXTURES = resolve(__dirname, '../../tests/fixtures/frameworks')

interface LCMEFixture {
  standards: Array<{
    id: string
    number: number
    title: string
    summary: string
    elements: Array<{
      id: string
      title: string
      summary: string
    }>
  }>
}

function loadFixture(): LCMEFixture {
  return JSON.parse(readFileSync(resolve(FIXTURES, 'lcme-standards.json'), 'utf-8'))
}

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedLCMEStandards(): Promise<void> {
  const institutionId = process.env.INSTITUTION_ID ?? 'msm-default'
  const ctx = { institution_id: institutionId }
  const fixture = loadFixture()

  console.log('[seed:06] Seeding LCME standards and elements from fixture...')
  let errors = 0

  for (const standard of fixture.standards) {
    // MERGE standard node — idempotent on code + institution_id
    const stdResult = await neo4jQuery(
      `MERGE (s:LCME_Standard {code: $code, institution_id: $institution_id})
       ON CREATE SET
         s.uuid = $uuid,
         s.number = $number,
         s.title = $title,
         s.summary = $summary
       ON MATCH SET
         s.number = $number,
         s.title = $title,
         s.summary = $summary`,
      {
        code: standard.id,
        uuid: randomUUID(),
        number: standard.number,
        title: standard.title,
        summary: standard.summary,
      },
      ctx
    )
    if (!stdResult) {
      console.error(`  ✗ Failed: LCME_Standard (${standard.id})`)
      errors++
    }

    // MERGE each element and its edge
    for (const element of standard.elements) {
      const elResult = await neo4jQuery(
        `MERGE (e:LCME_Element {code: $elementCode, institution_id: $institution_id})
         ON CREATE SET
           e.uuid = $uuid,
           e.title = $title,
           e.summary = $summary,
           e.standard_code = $standardCode
         ON MATCH SET
           e.title = $title,
           e.summary = $summary,
           e.standard_code = $standardCode
         WITH e
         MATCH (s:LCME_Standard {code: $standardCode, institution_id: $institution_id})
         MERGE (s)-[:HAS_ELEMENT]->(e)`,
        {
          elementCode: element.id,
          uuid: randomUUID(),
          title: element.title,
          summary: element.summary,
          standardCode: standard.id,
        },
        ctx
      )
      if (!elResult) {
        console.error(`  ✗ Failed: LCME_Element (${element.id})`)
        errors++
      }
    }
  }

  const totalElements = fixture.standards.reduce(
    (sum, s) => sum + s.elements.length,
    0
  )
  if (errors > 0) {
    console.error(`[seed:06] ⚠ ${errors} nodes failed`)
    throw new Error(`[seed:06] ${errors} nodes failed to seed`)
  }
  console.log(
    `[seed:06] Done — ${fixture.standards.length} standards, ${totalElements} elements`
  )
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  seedLCMEStandards()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed:06] FAILED:', err)
      process.exit(1)
    })
}
