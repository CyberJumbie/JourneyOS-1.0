/**
 * scripts/seeds/01-reference-nodes.ts — Seed reference/enum nodes into Neo4j
 *
 * Creates canonical taxonomy nodes used across all pipelines:
 * BloomLevel, MillerLevel, DifficultyBand, SessionType, LeadInType,
 * ClinicalSetting, PatientAgeGroup, AssessmentMode, ResourceType.
 *
 * Idempotent: uses MERGE on (name, institution_id) composite key.
 * Must be run FIRST in the seed sequence (no dependencies).
 *
 * Usage: tsx scripts/seeds/01-reference-nodes.ts
 */

import { neo4jQuery, type RequestContext } from '../../packages/neo4j/client'

// ---------------------------------------------------------------------------
// Data definitions
// ---------------------------------------------------------------------------

const BLOOM_LEVELS = [
  { name: 'Remember', level: 1 },
  { name: 'Understand', level: 2 },
  { name: 'Apply', level: 3 },
  { name: 'Analyze', level: 4 },
  { name: 'Evaluate', level: 5 },
  { name: 'Create', level: 6 },
] as const

const MILLER_LEVELS = [
  { name: 'Knows', level: 1 },
  { name: 'Knows How', level: 2 },
  { name: 'Shows How', level: 3 },
  { name: 'Does', level: 4 },
] as const

const DIFFICULTY_BANDS = [
  { name: 'Easy', ordinal: 1 },
  { name: 'Medium', ordinal: 2 },
  { name: 'Hard', ordinal: 3 },
  { name: 'Very Hard', ordinal: 4 },
  { name: 'Expert', ordinal: 5 },
] as const

const SESSION_TYPES = [
  'Practice',
  'Exam',
  'Tutorial',
  'Review',
  'Remediation',
] as const

const LEAD_IN_TYPES = [
  'Which of the following',
  'What is the most likely',
  'What is the next best step',
  'Which of the following is the most appropriate',
  'What is the mechanism of action',
  'Which of the following best explains',
  'What is the most common cause',
  'Which finding is most consistent with',
] as const

const CLINICAL_SETTINGS = [
  'Emergency Department',
  'Outpatient Clinic',
  'Inpatient Ward',
  'ICU',
  'Operating Room',
  'Primary Care Office',
  'Urgent Care',
  'Nursing Home',
  'Psychiatric Unit',
  'Rehabilitation Center',
] as const

const PATIENT_AGE_GROUPS = [
  { name: 'Neonate', min_age: 0, max_age: 0.077 },       // 0-28 days
  { name: 'Infant', min_age: 0.083, max_age: 1 },         // 1-12 months
  { name: 'Child', min_age: 1, max_age: 12 },              // 1-12 years
  { name: 'Adolescent', min_age: 13, max_age: 17 },        // 13-17 years
  { name: 'Young Adult', min_age: 18, max_age: 39 },       // 18-39 years
  { name: 'Middle-Aged Adult', min_age: 40, max_age: 64 }, // 40-64 years
  { name: 'Elderly', min_age: 65, max_age: 150 },          // 65+ years
] as const

const ASSESSMENT_MODES = [
  'Formative',
  'Summative',
  'Diagnostic',
  'Self-Assessment',
] as const

const RESOURCE_TYPES = [
  'Textbook',
  'Journal Article',
  'Clinical Guideline',
  'Lecture Slide',
  'Video',
  'Podcast',
  'Case Study',
  'Lab Manual',
] as const

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

interface SeedResult {
  label: string
  count: number
  errors: number
}

/**
 * Seed nodes with a level/ordinal numeric property.
 */
async function seedWithLevel(
  label: string,
  items: ReadonlyArray<{ name: string; level?: number; ordinal?: number }>,
  numericProp: 'level' | 'ordinal',
  ctx: RequestContext
): Promise<SeedResult> {
  let errors = 0

  for (const item of items) {
    const numericValue = numericProp === 'level' ? item.level : item.ordinal
    const result = await neo4jQuery(
      `MERGE (n:${label} {name: $name, institution_id: $institution_id})
       ON CREATE SET n.uuid = randomUUID(), n.${numericProp} = $numericValue, n.created_at = datetime()
       ON MATCH SET n.${numericProp} = $numericValue, n.updated_at = datetime()`,
      { name: item.name, numericValue },
      ctx
    )
    if (!result) errors++
  }

  return { label, count: items.length, errors }
}

/**
 * Seed simple name-only nodes.
 */
async function seedSimple(
  label: string,
  names: ReadonlyArray<string>,
  ctx: RequestContext
): Promise<SeedResult> {
  let errors = 0

  for (const name of names) {
    const result = await neo4jQuery(
      `MERGE (n:${label} {name: $name, institution_id: $institution_id})
       ON CREATE SET n.uuid = randomUUID(), n.created_at = datetime()
       ON MATCH SET n.updated_at = datetime()`,
      { name },
      ctx
    )
    if (!result) errors++
  }

  return { label, count: names.length, errors }
}

/**
 * Seed PatientAgeGroup nodes with min_age and max_age.
 */
async function seedAgeGroups(
  items: ReadonlyArray<{ name: string; min_age: number; max_age: number }>,
  ctx: RequestContext
): Promise<SeedResult> {
  let errors = 0

  for (const item of items) {
    const result = await neo4jQuery(
      `MERGE (n:PatientAgeGroup {name: $name, institution_id: $institution_id})
       ON CREATE SET n.uuid = randomUUID(), n.min_age = $min_age, n.max_age = $max_age, n.created_at = datetime()
       ON MATCH SET n.min_age = $min_age, n.max_age = $max_age, n.updated_at = datetime()`,
      { name: item.name, min_age: item.min_age, max_age: item.max_age },
      ctx
    )
    if (!result) errors++
  }

  return { label: 'PatientAgeGroup', count: items.length, errors }
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
  results.push(
    await seedWithLevel('BloomLevel', BLOOM_LEVELS as unknown as Array<{ name: string; level: number }>, 'level', ctx)
  )

  // 2. MillerLevel (4 nodes)
  results.push(
    await seedWithLevel('MillerLevel', MILLER_LEVELS as unknown as Array<{ name: string; level: number }>, 'level', ctx)
  )

  // 3. DifficultyBand (5 nodes)
  results.push(
    await seedWithLevel('DifficultyBand', DIFFICULTY_BANDS as unknown as Array<{ name: string; ordinal: number }>, 'ordinal', ctx)
  )

  // 4. SessionType (5 nodes)
  results.push(await seedSimple('SessionType', SESSION_TYPES, ctx))

  // 5. LeadInType (8 nodes)
  results.push(await seedSimple('LeadInType', LEAD_IN_TYPES, ctx))

  // 6. ClinicalSetting (10 nodes)
  results.push(await seedSimple('ClinicalSetting', CLINICAL_SETTINGS, ctx))

  // 7. PatientAgeGroup (7 nodes)
  results.push(
    await seedAgeGroups(PATIENT_AGE_GROUPS as unknown as Array<{ name: string; min_age: number; max_age: number }>, ctx)
  )

  // 8. AssessmentMode (4 nodes)
  results.push(await seedSimple('AssessmentMode', ASSESSMENT_MODES, ctx))

  // 9. ResourceType (8 nodes)
  results.push(await seedSimple('ResourceType', RESOURCE_TYPES, ctx))

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
seedReferenceNodes().catch(console.error)
