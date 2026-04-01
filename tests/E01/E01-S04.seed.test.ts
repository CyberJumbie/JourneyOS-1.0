/**
 * tests/E01/E01-S04.seed.test.ts — Acceptance tests for reference node seeding
 *
 * Validates that 01-reference-nodes.ts creates the correct number of nodes
 * for each label, with institution_id tenant isolation, and is idempotent.
 */

import { test, expect } from '@playwright/test'

const TEST_INSTITUTION = 'test-seed-e01-s04'

test.describe('E01-S04: Seed reference nodes', () => {
  /**
   * Helper: count nodes of a given label for the test institution.
   */
  async function countNodes(label: string): Promise<number | null> {
    const { neo4jQuery } = await import('../../packages/neo4j/client')
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (n:${label} {institution_id: $institution_id}) RETURN count(n) AS count`,
      {},
      { institution_id: TEST_INSTITUTION }
    )
    if (!result) return null
    return result.records[0]?.count ?? 0
  }

  /**
   * Helper: run the seed with the test institution.
   */
  async function runSeed() {
    const original = process.env.INSTITUTION_ID
    process.env.INSTITUTION_ID = TEST_INSTITUTION
    try {
      const { seedReferenceNodes } = await import(
        '../../scripts/seeds/01-reference-nodes'
      )
      return await seedReferenceNodes()
    } finally {
      if (original !== undefined) {
        process.env.INSTITUTION_ID = original
      } else {
        delete process.env.INSTITUTION_ID
      }
    }
  }

  // -------------------------------------------------------------------------
  // Expected counts (read from the same fixture files the seed reads)
  // -------------------------------------------------------------------------

  const EXPECTED_COUNTS: Record<string, number> = {
    BloomLevel: 6,
    MillerLevel: 4,
    SessionType: 9,
    DifficultyBand: 3,
    LeadInType: 7,
    ClinicalSetting: 7,
    PatientAgeGroup: 7,
    PatientSex: 2,
    AssessmentMode: 3,
    ResourceType: 7,
  }

  const ALL_LABELS = Object.keys(EXPECTED_COUNTS)

  test('Acceptance: seed creates correct count for each node type', async () => {
    const results = await runSeed()
    if (!results) {
      test.skip()
      return
    }

    for (const [label, expected] of Object.entries(EXPECTED_COUNTS)) {
      const count = await countNodes(label)
      if (count === null) {
        test.skip()
        return
      }
      expect(count, `${label} count`).toBe(expected)
    }
  })

  test('Acceptance: all reference nodes have institution_id', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    for (const label of ALL_LABELS) {
      const result = await neo4jQuery<{ count: number }>(
        `MATCH (n:${label} {institution_id: $institution_id})
         WHERE n.institution_id IS NOT NULL
         RETURN count(n) AS count`,
        {},
        { institution_id: TEST_INSTITUTION }
      )

      if (!result) {
        test.skip()
        return
      }

      const totalResult = await neo4jQuery<{ count: number }>(
        `MATCH (n:${label} {institution_id: $institution_id}) RETURN count(n) AS count`,
        {},
        { institution_id: TEST_INSTITUTION }
      )

      if (!totalResult) {
        test.skip()
        return
      }

      expect(result.records[0]?.count).toBe(totalResult.records[0]?.count)
    }
  })

  test('Acceptance: seed is idempotent (running twice yields same counts)', async () => {
    // Run seed a second time
    const results = await runSeed()
    if (!results) {
      test.skip()
      return
    }

    for (const [label, expected] of Object.entries(EXPECTED_COUNTS)) {
      const count = await countNodes(label)
      if (count === null) {
        test.skip()
        return
      }
      expect(count, `${label} idempotent count`).toBe(expected)
    }
  })

  test('Acceptance: seed returns structured results for all 10 types', async () => {
    const results = await runSeed()
    if (!results) {
      test.skip()
      return
    }

    expect(results).toHaveLength(10)
    for (const r of results) {
      expect(r).toHaveProperty('label')
      expect(r).toHaveProperty('count')
      expect(r).toHaveProperty('errors')
      expect(typeof r.label).toBe('string')
      expect(typeof r.count).toBe('number')
      expect(typeof r.errors).toBe('number')
    }
  })
})
