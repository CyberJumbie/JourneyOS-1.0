/**
 * scripts/seeds/03-task-shells.ts
 *
 * Seeds 12 TaskShell nodes into Neo4j from the canonical fixture file.
 * Idempotent: uses MERGE on id + institution_id.
 *
 * Run: pnpm tsx scripts/seeds/03-task-shells.ts
 */

import { neo4jQuery } from '../../packages/neo4j/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'

const FIXTURES = resolve(__dirname, '../../tests/fixtures/frameworks')

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(FIXTURES, name), 'utf-8')) as T
}

interface TaskShellFixture {
  id: string
  name: string
  concept_family: string
  bloom_range: [number, number]
  lead_in_type: string
  variable_slots: string[]
  template_structure: string
  avg_quality_score: number
}

interface TaskShellFixtureFile {
  source: string
  shells: TaskShellFixture[]
}

async function seedTaskShells(): Promise<void> {
  console.log('--- 03-task-shells: Seeding 12 TaskShell nodes ---')

  const ctx = { institution_id: INSTITUTION_ID }
  const fixture = loadFixture<TaskShellFixtureFile>('task-shells.json')

  for (const ts of fixture.shells) {
    const result = await neo4jQuery(
      `MERGE (ts:TaskShell {id: $id, institution_id: $institution_id})
       ON CREATE SET
         ts.uuid = randomUUID(),
         ts.name = $name,
         ts.concept_family = $concept_family,
         ts.bloom_range = $bloom_range,
         ts.lead_in_type = $lead_in_type,
         ts.variable_slots = $variable_slots,
         ts.template_structure = $template_structure,
         ts.avg_quality_score = $avg_quality_score,
         ts.created_at = datetime()
       ON MATCH SET
         ts.name = $name,
         ts.concept_family = $concept_family,
         ts.bloom_range = $bloom_range,
         ts.lead_in_type = $lead_in_type,
         ts.variable_slots = $variable_slots,
         ts.template_structure = $template_structure,
         ts.avg_quality_score = $avg_quality_score,
         ts.updated_at = datetime()
       RETURN ts.uuid AS uuid, ts.name AS name`,
      {
        id: ts.id,
        name: ts.name,
        concept_family: ts.concept_family,
        bloom_range: ts.bloom_range,
        lead_in_type: ts.lead_in_type,
        variable_slots: ts.variable_slots,
        template_structure: ts.template_structure,
        avg_quality_score: ts.avg_quality_score,
      },
      ctx
    )

    if (result) {
      const record = result.records[0]
      console.log(`  ✓ ${record?.name ?? ts.name} (${ts.concept_family})`)
    } else {
      console.error(`  ✗ Failed to seed: ${ts.name} (Neo4j unavailable)`)
    }
  }

  // Verify count
  const countResult = await neo4jQuery<{ count: number }>(
    `MATCH (ts:TaskShell {institution_id: $institution_id})
     RETURN count(ts) AS count`,
    {},
    ctx
  )

  if (countResult) {
    console.log(`\n  Total TaskShell nodes: ${countResult.records[0]?.count}`)
  }

  console.log('--- 03-task-shells: Done ---\n')
}

// Run if executed directly
seedTaskShells().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

export { seedTaskShells }
