/**
 * scripts/seeds/validate-seed.ts — Comprehensive validation of ALL seed data
 *
 * Validates every seed from 01 through 11, checking node counts and key
 * relationships. Exits 0 on all pass, exits 1 on any failure.
 *
 * Usage: pnpm run validate-seed
 */

import { neo4jQuery } from '../../packages/neo4j/client'

// ---------------------------------------------------------------------------
// Institution context
// ---------------------------------------------------------------------------
const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'
const ctx = { institution_id: INSTITUTION_ID }

// ---------------------------------------------------------------------------
// Check types
// ---------------------------------------------------------------------------

interface Check {
  name: string
  pass: boolean
  expected: number | string
  actual: number | string
}

// ---------------------------------------------------------------------------
// Helper: count nodes
// ---------------------------------------------------------------------------

async function countNodes(label: string): Promise<number> {
  const result = await neo4jQuery<{ count: number }>(
    `MATCH (n:${label} {institution_id: $institution_id}) RETURN count(n) AS count`,
    {},
    ctx
  )
  return result?.records[0]?.count ?? 0
}

async function countEdges(
  fromLabel: string,
  edgeType: string,
  toLabel: string
): Promise<number> {
  const result = await neo4jQuery<{ count: number }>(
    `MATCH (:${fromLabel} {institution_id: $institution_id})-[:${edgeType}]->(:${toLabel} {institution_id: $institution_id})
     RETURN count(*) AS count`,
    {},
    ctx
  )
  return result?.records[0]?.count ?? 0
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

async function validateSeed(): Promise<void> {
  console.log('\n=== SEED VALIDATION ===')
  console.log(`  Institution: ${INSTITUTION_ID}\n`)

  const checks: Check[] = []

  // ── 01: Reference nodes ─────────────────────────────────────────────────
  const bloomCount = await countNodes('BloomLevel')
  checks.push({ name: '01: BloomLevel', pass: bloomCount === 6, expected: 6, actual: bloomCount })

  const millerCount = await countNodes('MillerLevel')
  checks.push({ name: '01: MillerLevel', pass: millerCount === 4, expected: 4, actual: millerCount })

  const sessionTypeCount = await countNodes('SessionType')
  checks.push({ name: '01: SessionType', pass: sessionTypeCount === 9, expected: 9, actual: sessionTypeCount })

  const difficultyCount = await countNodes('DifficultyBand')
  checks.push({ name: '01: DifficultyBand', pass: difficultyCount === 3, expected: 3, actual: difficultyCount })

  const leadInCount = await countNodes('LeadInType')
  checks.push({ name: '01: LeadInType', pass: leadInCount === 7, expected: 7, actual: leadInCount })

  const clinicalSettingCount = await countNodes('ClinicalSetting')
  checks.push({ name: '01: ClinicalSetting', pass: clinicalSettingCount === 7, expected: 7, actual: clinicalSettingCount })

  const ageGroupCount = await countNodes('PatientAgeGroup')
  checks.push({ name: '01: PatientAgeGroup', pass: ageGroupCount === 7, expected: 7, actual: ageGroupCount })

  const sexCount = await countNodes('PatientSex')
  checks.push({ name: '01: PatientSex', pass: sexCount === 2, expected: 2, actual: sexCount })

  const assessmentModeCount = await countNodes('AssessmentMode')
  checks.push({ name: '01: AssessmentMode', pass: assessmentModeCount === 3, expected: 3, actual: assessmentModeCount })

  const resourceTypeCount = await countNodes('ResourceType')
  checks.push({ name: '01: ResourceType', pass: resourceTypeCount === 7, expected: 7, actual: resourceTypeCount })

  // ── 02: MisconceptionCategory ───────────────────────────────────────────
  const misconceptionCount = await countNodes('MisconceptionCategory')
  checks.push({ name: '02: MisconceptionCategory', pass: misconceptionCount === 15, expected: 15, actual: misconceptionCount })

  // ── 03: TaskShell ───────────────────────────────────────────────────────
  const taskShellCount = await countNodes('TaskShell')
  checks.push({ name: '03: TaskShell', pass: taskShellCount === 12, expected: 12, actual: taskShellCount })

  // ── 04: AnatomyRegion ───────────────────────────────────────────────────
  const anatomyCount = await countNodes('AnatomyRegion')
  checks.push({ name: '04: AnatomyRegion', pass: anatomyCount >= 50, expected: '>=50', actual: anatomyCount })

  const hasSubregionCount = await countEdges('AnatomyRegion', 'HAS_SUBREGION', 'AnatomyRegion')
  checks.push({ name: '04: AnatomyRegion→HAS_SUBREGION→AnatomyRegion', pass: hasSubregionCount >= 40, expected: '>=40', actual: hasSubregionCount })

  // ── 05: USMLE Taxonomy ─────────────────────────────────────────────────
  const systemCount = await countNodes('USMLE_System')
  checks.push({ name: '05: USMLE_System', pass: systemCount === 18, expected: 18, actual: systemCount })

  const topicCount = await countNodes('USMLE_Topic')
  checks.push({ name: '05: USMLE_Topic', pass: topicCount >= 100, expected: '>=100', actual: topicCount })

  const subtopicCount = await countNodes('USMLE_Subtopic')
  checks.push({ name: '05: USMLE_Subtopic', pass: subtopicCount >= 400, expected: '>=400', actual: subtopicCount })

  // Check USMLE hierarchy edges
  const topicPartOfCount = await countEdges('USMLE_Topic', 'PART_OF', 'USMLE_System')
  checks.push({ name: '05: USMLE_Topic→PART_OF→System', pass: topicPartOfCount >= 100, expected: '>=100', actual: topicPartOfCount })

  const subtopicBelongsCount = await countEdges('USMLE_Subtopic', 'BELONGS_TO', 'USMLE_Topic')
  checks.push({ name: '05: USMLE_Subtopic→BELONGS_TO→Topic', pass: subtopicBelongsCount >= 400, expected: '>=400', actual: subtopicBelongsCount })

  // ── 06: LCME Standards ──────────────────────────────────────────────────
  const lcmeStandardCount = await countNodes('LCME_Standard')
  checks.push({ name: '06: LCME_Standard', pass: lcmeStandardCount === 12, expected: 12, actual: lcmeStandardCount })

  const lcmeElementCount = await countNodes('LCME_Element')
  checks.push({ name: '06: LCME_Element', pass: lcmeElementCount >= 90, expected: '>=90', actual: lcmeElementCount })

  const hasElementCount = await countEdges('LCME_Standard', 'HAS_ELEMENT', 'LCME_Element')
  checks.push({ name: '06: LCME_Standard→HAS_ELEMENT→LCME_Element', pass: hasElementCount >= 93, expected: '>=93', actual: hasElementCount })

  // ── 07: IPEC + CarePhase ────────────────────────────────────────────────
  const ipecCompetencyCount = await countNodes('IPEC_Competency')
  checks.push({ name: '07: IPEC_Competency', pass: ipecCompetencyCount === 4, expected: 4, actual: ipecCompetencyCount })

  const ipecSubCompetencyCount = await countNodes('IPEC_SubCompetency')
  checks.push({ name: '07: IPEC_SubCompetency', pass: ipecSubCompetencyCount >= 35, expected: '>=35', actual: ipecSubCompetencyCount })

  const hasSubcompetencyCount = await countEdges('IPEC_Competency', 'HAS_SUBCOMPETENCY', 'IPEC_SubCompetency')
  checks.push({ name: '07: IPEC_Competency→HAS_SUBCOMPETENCY→IPEC_SubCompetency', pass: hasSubcompetencyCount >= 38, expected: '>=38', actual: hasSubcompetencyCount })

  const carePhaseCount = await countNodes('CarePhase')
  checks.push({ name: '07: CarePhase', pass: carePhaseCount === 5, expected: 5, actual: carePhaseCount })

  // ── 08: FewShotExample ──────────────────────────────────────────────────
  const fseCount = await countNodes('FewShotExample')
  checks.push({ name: '08: FewShotExample', pass: fseCount === 8, expected: 8, actual: fseCount })

  const exemplifiesCount = await countEdges('FewShotExample', 'EXEMPLIFIES', 'TaskShell')
  checks.push({ name: '08: FewShotExample→EXEMPLIFIES→TaskShell', pass: exemplifiesCount >= 8, expected: '>=8', actual: exemplifiesCount })

  // ── 09: MSM Catalog ─────────────────────────────────────────────────────
  const courseCount = await countNodes('Course')
  checks.push({ name: '09: Course', pass: courseCount === 24, expected: 24, actual: courseCount })

  const iloCount = await countNodes('ILO')
  checks.push({ name: '09: ILO', pass: iloCount === 10, expected: 10, actual: iloCount })

  const hasIloCount = await countEdges('Course', 'HAS_ILO', 'ILO')
  checks.push({ name: '09: Course→HAS_ILO→ILO', pass: hasIloCount >= 1, expected: '>=1', actual: hasIloCount })

  // ── 10: HetioNet ────────────────────────────────────────────────────────
  const geneCount = await countNodes('Gene')
  checks.push({ name: '10: Gene', pass: geneCount >= 50, expected: '>=50', actual: geneCount })

  const diseaseCount = await countNodes('Disease')
  checks.push({ name: '10: Disease', pass: diseaseCount >= 54, expected: '>=54', actual: diseaseCount })

  const compoundCount = await countNodes('Compound')
  checks.push({ name: '10: Compound', pass: compoundCount >= 30, expected: '>=30', actual: compoundCount })

  const associatesCount = await countEdges('Gene', 'ASSOCIATES_WITH', 'Disease')
  checks.push({ name: '10: Gene→ASSOCIATES_WITH→Disease', pass: associatesCount >= 40, expected: '>=40', actual: associatesCount })

  const treatsEdgeCount = await countEdges('Compound', 'TREATS', 'Disease')
  checks.push({ name: '10: Compound→TREATS→Disease', pass: treatsEdgeCount >= 30, expected: '>=30', actual: treatsEdgeCount })

  // ── 11: DrugBank ────────────────────────────────────────────────────────
  const drugCount = await countNodes('Drug')
  checks.push({ name: '11: Drug', pass: drugCount >= 51, expected: '>=51', actual: drugCount })

  const drugTargetCount = await countNodes('DrugTarget')
  checks.push({ name: '11: DrugTarget', pass: drugTargetCount >= 40, expected: '>=40', actual: drugTargetCount })

  const targetsCount = await countEdges('Drug', 'TARGETS', 'DrugTarget')
  checks.push({ name: '11: Drug→TARGETS→DrugTarget', pass: targetsCount >= 45, expected: '>=45', actual: targetsCount })

  const interactsCount = await countEdges('Drug', 'INTERACTS_WITH', 'Drug')
  checks.push({ name: '11: Drug→INTERACTS_WITH→Drug', pass: interactsCount >= 10, expected: '>=10', actual: interactsCount })

  // ── Print results ─────────────────────────────────────────────────────
  console.log('=== SEED VALIDATION RESULTS ===\n')
  let allPass = true
  let passCount = 0
  let failCount = 0

  for (const check of checks) {
    const icon = check.pass ? '✓' : '✗'
    const detail = `expected ${check.expected}, got ${check.actual}`
    console.log(`  ${icon} ${check.name} (${detail})`)
    if (check.pass) {
      passCount++
    } else {
      allPass = false
      failCount++
    }
  }

  console.log(`\n  Total: ${passCount} passed, ${failCount} failed, ${checks.length} total`)
  console.log(`\n${allPass ? '✓ ALL CHECKS PASSED' : '✗ SOME CHECKS FAILED'}\n`)

  process.exit(allPass ? 0 : 1)
}

// Run
validateSeed().catch((err) => {
  console.error('Validation failed:', err)
  process.exit(1)
})

export { validateSeed }
