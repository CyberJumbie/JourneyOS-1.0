/**
 * scripts/seeds/05-usmle-taxonomy.ts — USMLE Step 1 Taxonomy Seed
 *
 * Seeds the ASSESSMENT HUB of the Three-Hub Invariant (D06):
 *   USMLE_System (18) → USMLE_Topic (~100) → USMLE_Subtopic (~400)
 *
 * Reads from canonical fixture JSONs:
 *   - tests/fixtures/frameworks/usmle-systems-disciplines.json  (18 systems)
 *   - tests/fixtures/frameworks/usmle-content-outline.json      (topics + subtopics)
 *
 * Edge directions (Production Bible line 215):
 *   USMLE_Topic  -[:PART_OF]->    USMLE_System   (child → parent)
 *   USMLE_Subtopic -[:BELONGS_TO]-> USMLE_Topic  (child → parent)
 *
 * Idempotent: uses MERGE on {code, institution_id} composite key.
 *
 * Usage: pnpm tsx scripts/seeds/05-usmle-taxonomy.ts
 */

import { neo4jQuery } from '../../packages/neo4j/client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Institution context
// ---------------------------------------------------------------------------
const institutionId = process.env.INSTITUTION_ID ?? 'msm-default'
const ctx = { institution_id: institutionId }

// ---------------------------------------------------------------------------
// Load fixture files
// ---------------------------------------------------------------------------
const fixturesDir = resolve(__dirname, '../../tests/fixtures/frameworks')

interface SystemsFixture {
  content_outline_systems: Array<{
    code: string
    name: string
    step1_spec_category: string
  }>
}

interface ContentOutlineAgeGroup {
  group: string
  subtopics: string[]
}

interface ContentOutlineTopic {
  category: string
  subtopics?: string[]
  age_groups?: ContentOutlineAgeGroup[]
}

interface ContentOutlineSystem {
  id: string
  title: string
  topics: ContentOutlineTopic[]
}

interface ContentOutlineFixture {
  systems: ContentOutlineSystem[]
}

const systemsFixture: SystemsFixture = JSON.parse(
  readFileSync(resolve(fixturesDir, 'usmle-systems-disciplines.json'), 'utf-8')
)

const contentOutline: ContentOutlineFixture = JSON.parse(
  readFileSync(resolve(fixturesDir, 'usmle-content-outline.json'), 'utf-8')
)

// ---------------------------------------------------------------------------
// Map system codes to content outline IDs
// ---------------------------------------------------------------------------
const SYSTEM_TO_OUTLINE: Record<string, string> = {
  'SYS-01': 'human-development',
  'SYS-02': 'immune-system',
  'SYS-03': 'blood-lymphoreticular',
  'SYS-04': 'behavioral-health',
  'SYS-05': 'nervous-system-special-senses',
  'SYS-06': 'skin-subcutaneous',
  'SYS-07': 'musculoskeletal',
  'SYS-08': 'cardiovascular',
  'SYS-09': 'respiratory',
  'SYS-10': 'gastrointestinal',
  'SYS-11': 'renal-urinary',
  'SYS-12': 'pregnancy-childbirth',
  'SYS-13': 'female-reproductive-breast',
  'SYS-14': 'male-reproductive',
  'SYS-15': 'endocrine',
  'SYS-16': 'multisystem',
  'SYS-17': 'biostatistics-epi',
  'SYS-18': 'social-sciences',
}

// ---------------------------------------------------------------------------
// Data types (exported for tests)
// ---------------------------------------------------------------------------
export interface SystemDef {
  code: string
  name: string
  step1_spec_category: string
}

export interface SubtopicDef {
  code: string
  name: string
}

export interface TopicDef {
  code: string
  name: string
  systemCode: string
  subtopics: SubtopicDef[]
}

// ---------------------------------------------------------------------------
// Build SYSTEMS array from fixture
// ---------------------------------------------------------------------------
export const SYSTEMS: SystemDef[] = systemsFixture.content_outline_systems.map((s) => ({
  code: s.code,
  name: s.name,
  step1_spec_category: s.step1_spec_category,
}))

// ---------------------------------------------------------------------------
// Build TOPICS + subtopics from content outline fixture
// ---------------------------------------------------------------------------
function buildTopicsFromFixture(): TopicDef[] {
  const topics: TopicDef[] = []
  const outlineMap = new Map(contentOutline.systems.map((s) => [s.id, s]))

  for (const sys of SYSTEMS) {
    const outlineId = SYSTEM_TO_OUTLINE[sys.code]
    const outline = outlineId ? outlineMap.get(outlineId) : undefined

    if (!outline) {
      // SYS-17 and SYS-18 may not have content outline entries — skip topics
      continue
    }

    // For human-development, topics use age_groups instead of subtopics
    let topicIdx = 0
    for (const topic of outline.topics) {
      topicIdx++
      const topicCode = `${sys.code}-T${String(topicIdx).padStart(2, '0')}`

      // Collect subtopics — handle both flat subtopics and age_groups
      const subtopicNames: string[] = []
      if (topic.subtopics && topic.subtopics.length > 0) {
        subtopicNames.push(...topic.subtopics)
      } else if (topic.age_groups && topic.age_groups.length > 0) {
        // For age-grouped topics (human-development), each age group becomes subtopics
        // with group name prefix for clarity
        for (const ag of topic.age_groups) {
          for (const st of ag.subtopics) {
            subtopicNames.push(`${ag.group}: ${st}`)
          }
        }
      }

      const subtopics: SubtopicDef[] = subtopicNames.map((name, i) => ({
        code: `${topicCode}-S${String(i + 1).padStart(3, '0')}`,
        name,
      }))

      topics.push({
        code: topicCode,
        name: topic.category,
        systemCode: sys.code,
        subtopics,
      })
    }
  }

  return topics
}

export const TOPICS: TopicDef[] = buildTopicsFromFixture()

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------
export async function seedUsmle(): Promise<void> {
  console.log('[seed:05] Seeding USMLE taxonomy...')

  // 1. Create system nodes
  for (const sys of SYSTEMS) {
    await neo4jQuery(
      `MERGE (s:USMLE_System {code: $code, institution_id: $institution_id})
       ON CREATE SET s.uuid = randomUUID(), s.name = $name, s.step1_spec_category = $spec, s.created_at = datetime()
       ON MATCH SET s.name = $name, s.step1_spec_category = $spec, s.updated_at = datetime()`,
      { code: sys.code, name: sys.name, spec: sys.step1_spec_category },
      ctx
    )
  }
  console.log(`[seed:05]   ✓ ${SYSTEMS.length} systems`)

  // 2. Create topic nodes + PART_OF edges (topic → system)
  for (const topic of TOPICS) {
    await neo4jQuery(
      `MATCH (s:USMLE_System {code: $systemCode, institution_id: $institution_id})
       MERGE (t:USMLE_Topic {code: $code, institution_id: $institution_id})
       ON CREATE SET t.uuid = randomUUID(), t.name = $name, t.system_code = $systemCode, t.created_at = datetime()
       ON MATCH SET t.name = $name, t.updated_at = datetime()
       MERGE (t)-[:PART_OF]->(s)`,
      { systemCode: topic.systemCode, code: topic.code, name: topic.name },
      ctx
    )
  }
  console.log(`[seed:05]   ✓ ${TOPICS.length} topics`)

  // 3. Create subtopic nodes + BELONGS_TO edges (subtopic → topic)
  let subtopicCount = 0
  for (const topic of TOPICS) {
    for (const sub of topic.subtopics) {
      await neo4jQuery(
        `MATCH (t:USMLE_Topic {code: $topicCode, institution_id: $institution_id})
         MERGE (st:USMLE_Subtopic {code: $code, institution_id: $institution_id})
         ON CREATE SET st.uuid = randomUUID(), st.name = $name, st.topic_code = $topicCode, st.created_at = datetime()
         ON MATCH SET st.name = $name, st.updated_at = datetime()
         MERGE (st)-[:BELONGS_TO]->(t)`,
        { topicCode: topic.code, code: sub.code, name: sub.name },
        ctx
      )
      subtopicCount++
    }
  }
  console.log(`[seed:05]   ✓ ${subtopicCount} subtopics`)
  console.log('[seed:05] Done.')
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
if (require.main === module) {
  seedUsmle()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed:05] FATAL:', err)
      process.exit(1)
    })
}
