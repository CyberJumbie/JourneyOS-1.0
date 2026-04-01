/**
 * scripts/seeds/02-misconception-categories.ts
 *
 * Seeds 15 MisconceptionCategory nodes into Neo4j from the canonical fixture file.
 * Idempotent: uses MERGE on id + institution_id.
 *
 * Run: pnpm tsx scripts/seeds/02-misconception-categories.ts
 */

import { neo4jQuery } from '../../packages/neo4j/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'

const FIXTURES = resolve(__dirname, '../../tests/fixtures/frameworks')

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(FIXTURES, name), 'utf-8')) as T
}

interface MisconceptionCategoryFixture {
  id: string
  name: string
  description: string
  usmle_systems: string[]
  example_distractor_pattern: string
  empirical_frequency: number
}

interface MisconceptionFixtureFile {
  source: string
  categories: MisconceptionCategoryFixture[]
}

async function seedMisconceptionCategories(): Promise<void> {
  console.log('--- 02-misconception-categories: Seeding 15 MisconceptionCategory nodes ---')

  const ctx = { institution_id: INSTITUTION_ID }
  const fixture = loadFixture<MisconceptionFixtureFile>('misconception-categories.json')

  for (const mc of fixture.categories) {
    const result = await neo4jQuery(
      `MERGE (mc:MisconceptionCategory {id: $id, institution_id: $institution_id})
       ON CREATE SET
         mc.uuid = randomUUID(),
         mc.name = $name,
         mc.description = $description,
         mc.usmle_systems = $usmle_systems,
         mc.example_distractor_pattern = $pattern,
         mc.empirical_frequency = $freq,
         mc.created_at = datetime()
       ON MATCH SET
         mc.name = $name,
         mc.description = $description,
         mc.usmle_systems = $usmle_systems,
         mc.example_distractor_pattern = $pattern,
         mc.updated_at = datetime()
       RETURN mc.uuid AS uuid, mc.name AS name`,
      {
        id: mc.id,
        name: mc.name,
        description: mc.description,
        usmle_systems: mc.usmle_systems,
        pattern: mc.example_distractor_pattern,
        freq: mc.empirical_frequency,
      },
      ctx
    )

    if (result) {
      const record = result.records[0]
      console.log(`  ✓ ${record?.name ?? mc.name}`)
    } else {
      console.error(`  ✗ Failed to seed: ${mc.name} (Neo4j unavailable)`)
    }
  }

  // Verify count
  const countResult = await neo4jQuery<{ count: number }>(
    `MATCH (mc:MisconceptionCategory {institution_id: $institution_id})
     RETURN count(mc) AS count`,
    {},
    ctx
  )

  if (countResult) {
    console.log(`\n  Total MisconceptionCategory nodes: ${countResult.records[0]?.count}`)
  }

  console.log('--- 02-misconception-categories: Done ---\n')
}

// Run if executed directly
seedMisconceptionCategories().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

export { seedMisconceptionCategories }
