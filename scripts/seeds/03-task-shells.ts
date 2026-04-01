/**
 * scripts/seeds/03-task-shells.ts
 *
 * Seeds 12 TaskShell nodes into Neo4j.
 * Idempotent: uses MERGE on name + institution_id.
 *
 * Run: pnpm tsx scripts/seeds/03-task-shells.ts
 */

import { neo4jQuery } from '../../packages/neo4j/client'
import { randomUUID } from 'crypto'

const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'

interface TaskShellData {
  name: string
  template: string
  item_type: string
  bloom_level_min: number
  bloom_level_max: number
}

const TASK_SHELLS: TaskShellData[] = [
  {
    name: 'Single Best Answer (SBA)',
    template: 'Clinical vignette → single best answer from 5 options',
    item_type: 'SBA',
    bloom_level_min: 3,
    bloom_level_max: 5,
  },
  {
    name: 'Extended Matching (EMQ)',
    template: 'Lettered options list → multiple vignette stems → match each to best option',
    item_type: 'EMQ',
    bloom_level_min: 3,
    bloom_level_max: 4,
  },
  {
    name: 'Sequential Item Set',
    template: 'Multi-step clinical scenario → questions build on previous answers',
    item_type: 'SIS',
    bloom_level_min: 4,
    bloom_level_max: 6,
  },
  {
    name: 'Abstract Lead-in',
    template: 'Brief factual stem → identify concept, mechanism, or structure',
    item_type: 'ALI',
    bloom_level_min: 1,
    bloom_level_max: 2,
  },
  {
    name: 'Drug Mechanism',
    template: 'Patient scenario → identify drug mechanism or adverse effect',
    item_type: 'DRUG',
    bloom_level_min: 2,
    bloom_level_max: 4,
  },
  {
    name: 'Lab Interpretation',
    template: 'Clinical data + lab values → interpret findings or next step',
    item_type: 'LAB',
    bloom_level_min: 3,
    bloom_level_max: 5,
  },
  {
    name: 'Image-Based',
    template: 'Clinical image (histology, radiology, gross) → diagnosis or next step',
    item_type: 'IMG',
    bloom_level_min: 3,
    bloom_level_max: 5,
  },
  {
    name: 'Experimental Design',
    template: 'Research scenario → identify flaw, correct statistical test, or interpret results',
    item_type: 'EXP',
    bloom_level_min: 4,
    bloom_level_max: 6,
  },
  {
    name: 'Ethics/Legal',
    template: 'Clinical scenario with ethical dilemma → appropriate professional response',
    item_type: 'ETH',
    bloom_level_min: 3,
    bloom_level_max: 4,
  },
  {
    name: 'Preventive Medicine',
    template: 'Patient demographics + risk factors → appropriate screening or prevention',
    item_type: 'PREV',
    bloom_level_min: 2,
    bloom_level_max: 4,
  },
  {
    name: 'Acute Management',
    template: 'Emergency scenario → immediate next step in management',
    item_type: 'ACUTE',
    bloom_level_min: 3,
    bloom_level_max: 5,
  },
  {
    name: 'Communication',
    template: 'Patient interaction scenario → best communication approach',
    item_type: 'COMM',
    bloom_level_min: 3,
    bloom_level_max: 4,
  },
]

async function seedTaskShells(): Promise<void> {
  console.log('--- 03-task-shells: Seeding 12 TaskShell nodes ---')

  const ctx = { institution_id: INSTITUTION_ID }

  for (const ts of TASK_SHELLS) {
    const result = await neo4jQuery(
      `MERGE (ts:TaskShell {name: $name, institution_id: $institution_id})
       ON CREATE SET
         ts.uuid = $uuid,
         ts.template = $template,
         ts.item_type = $item_type,
         ts.bloom_level_min = $bloom_level_min,
         ts.bloom_level_max = $bloom_level_max,
         ts.created_at = datetime()
       ON MATCH SET
         ts.template = $template,
         ts.item_type = $item_type,
         ts.bloom_level_min = $bloom_level_min,
         ts.bloom_level_max = $bloom_level_max,
         ts.updated_at = datetime()
       RETURN ts.uuid AS uuid, ts.name AS name`,
      {
        uuid: randomUUID(),
        name: ts.name,
        template: ts.template,
        item_type: ts.item_type,
        bloom_level_min: ts.bloom_level_min,
        bloom_level_max: ts.bloom_level_max,
      },
      ctx
    )

    if (result) {
      const record = result.records[0]
      console.log(`  ✓ ${record?.name ?? ts.name} (${ts.item_type})`)
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

export { seedTaskShells, TASK_SHELLS }
