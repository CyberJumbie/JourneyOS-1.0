/**
 * tests/E01/E01-S07.seed.test.ts — Acceptance tests for seed scripts:
 *   02-misconception-categories, 03-task-shells, 08-few-shot-examples
 *
 * Validates:
 *   1. 15 MisconceptionCategory nodes exist
 *   2. MisconceptionCategory has required props: name, description, usmle_systems, example_distractor_pattern
 *   3. 12 TaskShell nodes exist
 *   4. TaskShell has: concept_family, bloom_range, lead_in_type, variable_slots, template_structure
 *   5. FewShotExample nodes linked to TaskShells via EXEMPLIFIES
 *   6. At least 8 few-shot examples covering 4 concept families
 *   7. Seeds are idempotent
 */

import { test, expect } from '@playwright/test'
import { neo4jQuery } from '../../packages/neo4j/client'

const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'
const ctx = { institution_id: INSTITUTION_ID }

test.describe('E01-S07: Seed MisconceptionCategory, TaskShell, FewShotExample', () => {
  // ---------------------------------------------------------------------------
  // 1. 15 MisconceptionCategory nodes exist
  // ---------------------------------------------------------------------------

  test('Acceptance: 15 MisconceptionCategory nodes exist', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (mc:MisconceptionCategory {institution_id: $institution_id})
       RETURN count(mc) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBe(15)
  })

  // ---------------------------------------------------------------------------
  // 2. MisconceptionCategory nodes have required properties
  // ---------------------------------------------------------------------------

  test('Acceptance: MisconceptionCategory nodes have required properties', async () => {
    const result = await neo4jQuery<{
      name: string
      description: string
      usmle_systems: string[]
      example_distractor_pattern: string
      uuid: string
    }>(
      `MATCH (mc:MisconceptionCategory {institution_id: $institution_id})
       RETURN mc.name AS name, mc.description AS description,
              mc.usmle_systems AS usmle_systems,
              mc.example_distractor_pattern AS example_distractor_pattern,
              mc.uuid AS uuid`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records.length).toBe(15)

    for (const record of result.records) {
      expect(record.name, 'name should be a non-empty string').toBeTruthy()
      expect(typeof record.name).toBe('string')

      expect(record.description, 'description should be a non-empty string').toBeTruthy()
      expect(typeof record.description).toBe('string')

      expect(Array.isArray(record.usmle_systems), 'usmle_systems should be an array').toBe(true)
      expect(record.usmle_systems.length, 'usmle_systems should have at least one entry').toBeGreaterThan(0)

      expect(record.example_distractor_pattern, 'example_distractor_pattern should be a non-empty string').toBeTruthy()
      expect(typeof record.example_distractor_pattern).toBe('string')

      expect(record.uuid, 'uuid should be a non-empty string').toBeTruthy()
    }
  })

  // ---------------------------------------------------------------------------
  // 3. 12 TaskShell nodes exist
  // ---------------------------------------------------------------------------

  test('Acceptance: 12 TaskShell nodes exist', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (ts:TaskShell {institution_id: $institution_id})
       RETURN count(ts) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBe(12)
  })

  // ---------------------------------------------------------------------------
  // 4. TaskShell nodes have canonical properties
  // ---------------------------------------------------------------------------

  test('Acceptance: TaskShell nodes have canonical properties', async () => {
    const result = await neo4jQuery<{
      name: string
      concept_family: string
      bloom_range: number[]
      lead_in_type: string
      variable_slots: string[]
      template_structure: string
    }>(
      `MATCH (ts:TaskShell {institution_id: $institution_id})
       RETURN ts.name AS name, ts.concept_family AS concept_family,
              ts.bloom_range AS bloom_range, ts.lead_in_type AS lead_in_type,
              ts.variable_slots AS variable_slots,
              ts.template_structure AS template_structure`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records.length).toBe(12)

    for (const record of result.records) {
      expect(record.concept_family, `${record.name}: concept_family should be set`).toBeTruthy()
      expect(typeof record.concept_family).toBe('string')

      expect(Array.isArray(record.bloom_range), `${record.name}: bloom_range should be an array`).toBe(true)
      expect(record.bloom_range.length, `${record.name}: bloom_range should have 2 elements`).toBe(2)
      expect(record.bloom_range[0], `${record.name}: bloom_range[0] should be >= 1`).toBeGreaterThanOrEqual(1)
      expect(record.bloom_range[1], `${record.name}: bloom_range[1] should be <= 6`).toBeLessThanOrEqual(6)
      expect(record.bloom_range[0], `${record.name}: bloom_range[0] <= bloom_range[1]`).toBeLessThanOrEqual(record.bloom_range[1])

      expect(record.lead_in_type, `${record.name}: lead_in_type should be set`).toBeTruthy()

      expect(Array.isArray(record.variable_slots), `${record.name}: variable_slots should be an array`).toBe(true)
      expect(record.variable_slots.length, `${record.name}: variable_slots should have at least one entry`).toBeGreaterThan(0)

      expect(record.template_structure, `${record.name}: template_structure should be set`).toBeTruthy()
      expect(typeof record.template_structure).toBe('string')
    }
  })

  // ---------------------------------------------------------------------------
  // 5. FewShotExample nodes linked to TaskShells via EXEMPLIFIES
  // ---------------------------------------------------------------------------

  test('Acceptance: FewShotExample nodes linked to TaskShells via EXEMPLIFIES', async () => {
    const result = await neo4jQuery<{
      example_id: string
      item_type: string
      ts_name: string
    }>(
      `MATCH (fse:FewShotExample {institution_id: $institution_id})
             -[:EXEMPLIFIES]->(ts:TaskShell {institution_id: $institution_id})
       RETURN fse.example_id AS example_id, fse.item_type AS item_type, ts.name AS ts_name`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records.length, 'All few-shot examples should be linked to a TaskShell').toBeGreaterThanOrEqual(8)

    for (const record of result.records) {
      expect(record.example_id).toBeTruthy()
      expect(record.item_type).toBeTruthy()
      expect(record.ts_name).toBeTruthy()
    }
  })

  // ---------------------------------------------------------------------------
  // 6. At least 2 few-shot examples per concept family
  // ---------------------------------------------------------------------------

  test('Acceptance: at least 2 few-shot examples per concept family', async () => {
    const CONCEPT_FAMILIES = ['diagnosis', 'mechanism', 'next_step', 'test_selection']

    const result = await neo4jQuery<{ item_type: string; count: number }>(
      `MATCH (fse:FewShotExample {institution_id: $institution_id})
       RETURN fse.item_type AS item_type, count(fse) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    const familyCounts = new Map(result.records.map((r) => [r.item_type, r.count]))

    for (const family of CONCEPT_FAMILIES) {
      const count = familyCounts.get(family) ?? 0
      expect(
        count,
        `Should have at least 2 FewShotExamples for concept family '${family}', got ${count}`
      ).toBeGreaterThanOrEqual(2)
    }
  })

  // ---------------------------------------------------------------------------
  // 7. Seeds are idempotent — running twice produces same count
  // ---------------------------------------------------------------------------

  test('Acceptance: seeds are idempotent (MERGE does not duplicate)', async () => {
    // Import and run the seeds
    const { seedMisconceptionCategories } = await import(
      '../../scripts/seeds/02-misconception-categories'
    )
    const { seedTaskShells } = await import('../../scripts/seeds/03-task-shells')
    const { seedFewShotExamples } = await import('../../scripts/seeds/08-few-shot-examples')

    // Run all seeds a second time
    await seedMisconceptionCategories()
    await seedTaskShells()
    await seedFewShotExamples()

    // Verify counts remain the same
    const mcCount = await neo4jQuery<{ count: number }>(
      `MATCH (mc:MisconceptionCategory {institution_id: $institution_id})
       RETURN count(mc) AS count`,
      {},
      ctx
    )

    const tsCount = await neo4jQuery<{ count: number }>(
      `MATCH (ts:TaskShell {institution_id: $institution_id})
       RETURN count(ts) AS count`,
      {},
      ctx
    )

    const fseCount = await neo4jQuery<{ count: number }>(
      `MATCH (fse:FewShotExample {institution_id: $institution_id})
       RETURN count(fse) AS count`,
      {},
      ctx
    )

    if (!mcCount || !tsCount || !fseCount) {
      console.warn('Neo4j unavailable — skipping idempotency check')
      test.skip()
      return
    }

    expect(mcCount.records[0]?.count).toBe(15)
    expect(tsCount.records[0]?.count).toBe(12)
    expect(fseCount.records[0]?.count).toBe(8)
  })
})
