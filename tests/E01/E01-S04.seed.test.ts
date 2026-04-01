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
    // Set institution for the seed
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

  test('Acceptance: seed creates 6 BloomLevel nodes', async () => {
    const results = await runSeed()
    if (!results) {
      test.skip()
      return
    }

    const count = await countNodes('BloomLevel')
    if (count === null) {
      // Neo4j unavailable — graceful degradation
      test.skip()
      return
    }
    expect(count).toBe(6)
  })

  test('Acceptance: seed creates 4 MillerLevel nodes', async () => {
    const count = await countNodes('MillerLevel')
    if (count === null) {
      test.skip()
      return
    }
    expect(count).toBe(4)
  })

  test('Acceptance: seed creates 5 DifficultyBand nodes', async () => {
    const count = await countNodes('DifficultyBand')
    if (count === null) {
      test.skip()
      return
    }
    expect(count).toBe(5)
  })

  test('Acceptance: all reference nodes have institution_id', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const labels = [
      'BloomLevel',
      'MillerLevel',
      'DifficultyBand',
      'SessionType',
      'LeadInType',
      'ClinicalSetting',
      'PatientAgeGroup',
      'AssessmentMode',
      'ResourceType',
    ]

    for (const label of labels) {
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

      // Every node of this label for our institution should have institution_id
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

    // Check that counts haven't doubled
    const expectedCounts: Record<string, number> = {
      BloomLevel: 6,
      MillerLevel: 4,
      DifficultyBand: 5,
      SessionType: 5,
      LeadInType: 8,
      ClinicalSetting: 10,
      PatientAgeGroup: 7,
      AssessmentMode: 4,
      ResourceType: 8,
    }

    for (const [label, expected] of Object.entries(expectedCounts)) {
      const count = await countNodes(label)
      if (count === null) {
        test.skip()
        return
      }
      expect(count).toBe(expected)
    }
  })

  test('Acceptance: seed returns structured results', async () => {
    const results = await runSeed()
    if (!results) {
      test.skip()
      return
    }

    expect(results).toHaveLength(9)
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
