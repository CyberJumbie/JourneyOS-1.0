/**
 * scripts/seeds/02-misconception-categories.ts
 *
 * Seeds 15 MisconceptionCategory nodes into Neo4j.
 * Idempotent: uses MERGE on name + institution_id.
 *
 * Run: pnpm tsx scripts/seeds/02-misconception-categories.ts
 */

import { neo4jQuery } from '../../packages/neo4j/client'
import { randomUUID } from 'crypto'

const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'

interface MisconceptionCategoryData {
  name: string
  description: string
  common_in: string[]
}

const MISCONCEPTION_CATEGORIES: MisconceptionCategoryData[] = [
  {
    name: 'Mechanism Confusion',
    description: 'Confuses mechanism of action with related pathway',
    common_in: ['Pharmacology', 'Biochemistry'],
  },
  {
    name: 'Anatomical Adjacency Error',
    description: 'Selects anatomically adjacent but incorrect structure',
    common_in: ['Anatomy', 'Surgery'],
  },
  {
    name: 'Temporal Sequence Error',
    description: 'Confuses order of events in a process',
    common_in: ['Physiology', 'Embryology'],
  },
  {
    name: 'Similar Name Confusion',
    description: 'Confuses diseases/drugs/structures with similar names',
    common_in: ['All disciplines'],
  },
  {
    name: 'Pathophysiology Reversal',
    description: 'Confuses cause and effect in disease process',
    common_in: ['Pathology'],
  },
  {
    name: 'Drug Class Generalization',
    description: 'Applies class effect to wrong member',
    common_in: ['Pharmacology'],
  },
  {
    name: 'Statistical Misinterpretation',
    description: 'Misapplies statistical concept or study design',
    common_in: ['Biostatistics', 'Epidemiology'],
  },
  {
    name: 'Incomplete Differential',
    description: 'Fixates on one diagnosis, misses critical alternative',
    common_in: ['Clinical Medicine'],
  },
  {
    name: 'Age-Group Extrapolation',
    description: 'Applies adult findings/treatments to pediatric or vice versa',
    common_in: ['Pediatrics', 'Geriatrics'],
  },
  {
    name: 'Enzyme/Receptor Substitution',
    description: 'Confuses related enzymes or receptor subtypes',
    common_in: ['Biochemistry', 'Pharmacology'],
  },
  {
    name: 'Inheritance Pattern Error',
    description: 'Misidentifies mode of genetic inheritance',
    common_in: ['Genetics'],
  },
  {
    name: 'Immunological Cross-Reactivity',
    description: 'Confuses immune mechanisms or cell types',
    common_in: ['Immunology'],
  },
  {
    name: 'Microorganism Misidentification',
    description: 'Confuses organisms with similar characteristics',
    common_in: ['Microbiology'],
  },
  {
    name: 'Electrolyte Imbalance Confusion',
    description: 'Confuses presentations of different electrolyte disorders',
    common_in: ['Internal Medicine'],
  },
  {
    name: 'Management Sequence Error',
    description: 'Selects correct intervention but at wrong stage',
    common_in: ['Clinical Medicine'],
  },
]

async function seedMisconceptionCategories(): Promise<void> {
  console.log('--- 02-misconception-categories: Seeding 15 MisconceptionCategory nodes ---')

  const ctx = { institution_id: INSTITUTION_ID }

  for (const mc of MISCONCEPTION_CATEGORIES) {
    const result = await neo4jQuery(
      `MERGE (mc:MisconceptionCategory {name: $name, institution_id: $institution_id})
       ON CREATE SET
         mc.uuid = $uuid,
         mc.description = $description,
         mc.common_in = $common_in,
         mc.created_at = datetime()
       ON MATCH SET
         mc.description = $description,
         mc.common_in = $common_in,
         mc.updated_at = datetime()
       RETURN mc.uuid AS uuid, mc.name AS name`,
      {
        uuid: randomUUID(),
        name: mc.name,
        description: mc.description,
        common_in: mc.common_in,
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

export { seedMisconceptionCategories, MISCONCEPTION_CATEGORIES }
