/**
 * scripts/seeds/09-msm-catalog.ts — Seed MSM course catalog into Neo4j
 *
 * Reads the canonical MSM catalog from tests/fixtures/catalog/msm-catalog.json
 * and creates Course nodes + ILO nodes with HAS_ILO edges.
 *
 * NOTE: No courses table exists in Supabase yet (E01-S01 migration only has
 * lectures with course_id FK but no courses table). This seed writes to Neo4j
 * only. A future migration should add a courses table for full dual-write (Rule 6).
 *
 * Idempotent: uses MERGE on {code, institution_id} composite key.
 *
 * Usage: pnpm tsx scripts/seeds/09-msm-catalog.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { neo4jQuery } from '../../packages/neo4j/client'

// ---------------------------------------------------------------------------
// Institution context
// ---------------------------------------------------------------------------
const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'
const ctx = { institution_id: INSTITUTION_ID }

// ---------------------------------------------------------------------------
// Catalog loading
// ---------------------------------------------------------------------------

const CATALOG_PATH = resolve(__dirname, '../../tests/fixtures/catalog/msm-catalog.json')

interface CatalogCourse {
  id: string
  code: string
  name: string
  course_type: string
  credit_hours: number
  description: string
  grading?: string
  required?: boolean
  duration_weeks?: number | null
  usmle_systems?: string[]
  ilos?: string[]
  curriculum_units?: Array<{ id: string; name: string; order: number }>
  acgme_domains?: string[]
  clinical_sites?: string[]
}

interface CatalogILO {
  id: string
  domain: string
  text: string
}

interface CatalogBlock {
  id: string
  name: string
  courses: CatalogCourse[]
}

interface CatalogPhase {
  id: string
  name: string
  abbreviation: string
  blocks: CatalogBlock[]
}

interface CatalogYear {
  id: string
  name: string
  year_number: number
  type: string
  phases: CatalogPhase[]
  longitudinal_courses: CatalogCourse[]
}

interface CatalogProgram {
  id: string
  name: string
  academic_years: CatalogYear[]
}

interface MSMCatalog {
  programs: CatalogProgram[]
  institutional_learning_objectives: CatalogILO[]
}

/**
 * Extract all courses from the nested catalog structure.
 * Courses live in: programs[].academic_years[].phases[].blocks[].courses[]
 * and:             programs[].academic_years[].longitudinal_courses[]
 */
function extractCourses(catalog: MSMCatalog): Array<CatalogCourse & { year_name: string }> {
  const courses: Array<CatalogCourse & { year_name: string }> = []

  for (const program of catalog.programs) {
    for (const year of program.academic_years) {
      // Block courses
      for (const phase of year.phases) {
        for (const block of phase.blocks) {
          for (const course of block.courses) {
            courses.push({ ...course, year_name: year.name })
          }
        }
      }
      // Longitudinal courses
      for (const course of year.longitudinal_courses) {
        courses.push({ ...course, year_name: year.name })
      }
    }
  }

  return courses
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function seedMSMCatalog(): Promise<void> {
  console.log('--- 09-msm-catalog: Seeding MSM Course Catalog ---')

  const rawCatalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8')) as MSMCatalog
  const courses = extractCourses(rawCatalog)
  const ilos = rawCatalog.institutional_learning_objectives

  console.log(`  Found ${courses.length} courses, ${ilos.length} ILOs`)

  // ── Seed ILO nodes ──────────────────────────────────────────────────────
  let iloErrors = 0
  for (const ilo of ilos) {
    const result = await neo4jQuery(
      `MERGE (ilo:ILO {ilo_id: $ilo_id, institution_id: $institution_id})
       ON CREATE SET
         ilo.uuid = randomUUID(),
         ilo.domain = $domain,
         ilo.text = $text,
         ilo.created_at = datetime()
       ON MATCH SET
         ilo.domain = $domain,
         ilo.text = $text,
         ilo.updated_at = datetime()
       RETURN ilo.uuid AS uuid`,
      { ilo_id: ilo.id, domain: ilo.domain, text: ilo.text },
      ctx
    )
    if (result) {
      console.log(`  ✓ ILO (${ilo.id}): ${ilo.domain}`)
    } else {
      console.error(`  ✗ Failed to seed ILO (${ilo.id})`)
      iloErrors++
    }
  }

  // ── Seed Course nodes ───────────────────────────────────────────────────
  // NOTE: No Supabase courses table exists yet. Neo4j only for now.
  // TODO: Add dual-write when courses migration is created (Rule 6).
  let courseErrors = 0
  for (const course of courses) {
    const result = await neo4jQuery(
      `MERGE (c:Course {code: $code, institution_id: $institution_id})
       ON CREATE SET
         c.uuid = randomUUID(),
         c.name = $name,
         c.course_type = $course_type,
         c.credit_hours = $credit_hours,
         c.description = $description,
         c.year_name = $year_name,
         c.usmle_systems = $usmle_systems,
         c.created_at = datetime()
       ON MATCH SET
         c.name = $name,
         c.course_type = $course_type,
         c.credit_hours = $credit_hours,
         c.description = $description,
         c.year_name = $year_name,
         c.usmle_systems = $usmle_systems,
         c.updated_at = datetime()
       RETURN c.uuid AS uuid`,
      {
        code: course.code,
        name: course.name,
        course_type: course.course_type,
        credit_hours: course.credit_hours,
        description: course.description,
        year_name: course.year_name,
        usmle_systems: course.usmle_systems ?? [],
      },
      ctx
    )

    if (result) {
      console.log(`  ✓ Course (${course.code}): ${course.name}`)
    } else {
      console.error(`  ✗ Failed to seed Course (${course.code})`)
      courseErrors++
    }

    // ── Link Course → ILO via HAS_ILO edges ────────────────────────────
    if (course.ilos && course.ilos.length > 0) {
      for (const iloId of course.ilos) {
        const edgeResult = await neo4jQuery(
          `MATCH (c:Course {code: $code, institution_id: $institution_id})
           MATCH (ilo:ILO {ilo_id: $ilo_id, institution_id: $institution_id})
           MERGE (c)-[:HAS_ILO]->(ilo)
           RETURN c.code AS code, ilo.ilo_id AS ilo_id`,
          { code: course.code, ilo_id: iloId },
          ctx
        )
        if (edgeResult && edgeResult.records.length > 0) {
          console.log(`    → HAS_ILO → ${iloId}`)
        } else {
          console.warn(`    ⚠ Could not link Course (${course.code}) to ILO (${iloId})`)
        }
      }
    }
  }

  // ── Verify counts ─────────────────────────────────────────────────────
  const courseCount = await neo4jQuery<{ count: number }>(
    `MATCH (c:Course {institution_id: $institution_id}) RETURN count(c) AS count`,
    {},
    ctx
  )
  const iloCount = await neo4jQuery<{ count: number }>(
    `MATCH (ilo:ILO {institution_id: $institution_id}) RETURN count(ilo) AS count`,
    {},
    ctx
  )
  const edgeCount = await neo4jQuery<{ count: number }>(
    `MATCH (:Course {institution_id: $institution_id})-[:HAS_ILO]->(:ILO {institution_id: $institution_id})
     RETURN count(*) AS count`,
    {},
    ctx
  )

  console.log(`\n  Total Course nodes: ${courseCount?.records[0]?.count ?? 'unknown'}`)
  console.log(`  Total ILO nodes: ${iloCount?.records[0]?.count ?? 'unknown'}`)
  console.log(`  Total HAS_ILO edges: ${edgeCount?.records[0]?.count ?? 'unknown'}`)

  if (courseErrors > 0 || iloErrors > 0) {
    console.error(`  ⚠ Errors: ${courseErrors} course(s), ${iloErrors} ILO(s)`)
  } else {
    console.log('  ✓ MSM catalog seeded successfully')
  }

  console.log('--- 09-msm-catalog: Done ---\n')
}

// Run if executed directly
seedMSMCatalog().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
