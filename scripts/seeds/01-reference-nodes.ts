/**
 * scripts/seeds/01-reference-nodes.ts — Seed reference/enum nodes into Neo4j
 *
 * Reads canonical data from JSON fixture files at tests/fixtures/frameworks/.
 * Creates taxonomy nodes used across all pipelines:
 * BloomLevel, MillerLevel, DifficultyBand, SessionType, LeadInType,
 * ClinicalSetting, PatientAgeGroup, PatientSex, AssessmentMode, ResourceType.
 *
 * Idempotent: uses MERGE on (name, institution_id) composite key.
 * Must be run FIRST in the seed sequence (no dependencies).
 *
 * Usage: tsx scripts/seeds/01-reference-nodes.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { neo4jQuery, type RequestContext } from '../../packages/neo4j/client'

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

const FIXTURES = resolve(__dirname, '../../tests/fixtures/frameworks')

function loadFixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(FIXTURES, name), 'utf-8'))
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedResult {
  label: string
  count: number
  errors: number
}

// ---------------------------------------------------------------------------
// Generic seed helper
// ---------------------------------------------------------------------------

/**
 * Seed nodes with arbitrary properties. MERGE on {name, institution_id}.
 * ON CREATE sets uuid + created_at. ON MATCH sets updated_at.
 * All additional properties are set on both CREATE and MATCH.
 */
async function seedNodes(
  label: string,
  items: Array<Record<string, unknown>>,
  ctx: RequestContext
): Promise<SeedResult> {
  let errors = 0

  for (const item of items) {
    // Build SET clauses for all properties beyond 'name'
    const propKeys = Object.keys(item).filter((k) => k !== 'name')
    const createSetParts = [
      'n.uuid = randomUUID()',
      'n.created_at = datetime()',
      ...propKeys.map((k) => `n.${k} = $${k}`),
    ]
    const matchSetParts = [
      'n.updated_at = datetime()',
      ...propKeys.map((k) => `n.${k} = $${k}`),
    ]

    const cypher = `MERGE (n:${label} {name: $name, institution_id: $institution_id})
     ON CREATE SET ${createSetParts.join(', ')}
     ON MATCH SET ${matchSetParts.join(', ')}`

    const result = await neo4jQuery(cypher, item, ctx)
    if (!result) errors++
  }

  return { label, count: items.length, errors }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function seedReferenceNodes(): Promise<SeedResult[]> {
  const institutionId = process.env.INSTITUTION_ID ?? 'msm-default'
  const ctx: RequestContext = { institution_id: institutionId }

  console.log(`Seeding reference nodes for institution: ${institutionId}`)
  console.log('---')

  const results: SeedResult[] = []

  // 1. BloomLevel (6 nodes)
  const bloomData = loadFixture('bloom-levels.json') as {
    levels: Array<{ name: string; level: number; description: string; verbs: string[] }>
  }
  results.push(await seedNodes('BloomLevel', bloomData.levels, ctx))

  // 2. MillerLevel (4 nodes)
  const millerData = loadFixture('miller-levels.json') as {
    levels: Array<{ name: string; level: number; description: string; assessment: string }>
  }
  results.push(await seedNodes('MillerLevel', millerData.levels, ctx))

  // 3. SessionType (9 nodes)
  const sessionData = loadFixture('session-types.json') as {
    types: Array<{
      name: string
      expected_bloom_range: string
      typical_duration: string
      description: string
    }>
  }
  results.push(await seedNodes('SessionType', sessionData.types, ctx))

  // 4. DifficultyBand (3 nodes) — derive ordinal from position
  const difficultyData = loadFixture('difficulty-levels.json') as {
    levels: Array<{ name: string; description: string; target_correct_pct: number }>
  }
  const difficultyItems = difficultyData.levels.map((d, i) => ({
    ...d,
    ordinal: i + 1,
  }))
  results.push(await seedNodes('DifficultyBand', difficultyItems, ctx))

  // 5. LeadInType (7 nodes)
  const leadInData = loadFixture('lead-in-types.json') as {
    types: Array<{ name: string; description: string }>
  }
  results.push(await seedNodes('LeadInType', leadInData.types, ctx))

  // 6. ClinicalSetting (7 nodes) — simple string array
  const clinicalData = loadFixture('clinical-settings.json') as {
    settings: string[]
  }
  const clinicalItems = clinicalData.settings.map((name) => ({ name }))
  results.push(await seedNodes('ClinicalSetting', clinicalItems, ctx))

  // 7. PatientAgeGroup (7 nodes) + PatientSex (2 nodes) from demographic-profiles.json
  const demoData = loadFixture('demographic-profiles.json') as {
    profiles: Array<{ category: string; values: string[] }>
  }
  const ageProfile = demoData.profiles.find((p) => p.category === 'age_groups')
  if (ageProfile) {
    const ageItems = ageProfile.values.map((name) => ({ name }))
    results.push(await seedNodes('PatientAgeGroup', ageItems, ctx))
  }
  const sexProfile = demoData.profiles.find((p) => p.category === 'sex')
  if (sexProfile) {
    const sexItems = sexProfile.values.map((name) => ({ name }))
    results.push(await seedNodes('PatientSex', sexItems, ctx))
  }

  // 8. AssessmentMode (3 nodes)
  const assessmentData = loadFixture('assessment-modes.json') as {
    modes: Array<{
      name: string
      stakes: string
      scoring_model: string
      contributes_to_grade: boolean
      contributes_to_mastery: boolean
    }>
  }
  results.push(await seedNodes('AssessmentMode', assessmentData.modes, ctx))

  // 9. ResourceType (7 nodes)
  const resourceData = loadFixture('resource-types.json') as {
    types: Array<{ name: string; description: string }>
  }
  results.push(await seedNodes('ResourceType', resourceData.types, ctx))

  // Summary
  console.log('')
  let totalNodes = 0
  let totalErrors = 0
  for (const r of results) {
    const status = r.errors === 0 ? '✓' : `✗ (${r.errors} errors)`
    console.log(`  ${status} ${r.label}: ${r.count} nodes`)
    totalNodes += r.count
    totalErrors += r.errors
  }
  console.log('---')
  console.log(`Total: ${totalNodes} reference nodes, ${totalErrors} errors`)

  if (totalErrors > 0) {
    console.error('⚠ Some nodes failed to seed — check Neo4j connectivity')
  } else {
    console.log('✓ Reference nodes seeded successfully')
  }

  return results
}

// Run if executed directly
seedReferenceNodes()
  .then(results => {
    const hasErrors = results.some(r => r.errors > 0)
    if (hasErrors) process.exit(1)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
