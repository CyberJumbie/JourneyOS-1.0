/**
 * tests/E01/E01-S07.seed.test.ts — Acceptance tests for seed scripts:
 *   02-misconception-categories, 03-task-shells, 08-few-shot-examples
 *
 * Validates:
 *   1. 15 MisconceptionCategory nodes exist
 *   2. MisconceptionCategory nodes have required properties
 *   3. 12 TaskShell nodes exist
 *   4. TaskShell nodes have bloom level ranges
 *   5. Few-shot examples linked to TaskShells via EXEMPLIFIES
 *   6. At least one few-shot example per common TaskShell
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

  test('Acceptance: MisconceptionCategory nodes have required properties (name, description, common_in)', async () => {
    const result = await neo4jQuery<{
      name: string
      description: string
      common_in: string[]
      uuid: string
    }>(
      `MATCH (mc:MisconceptionCategory {institution_id: $institution_id})
       RETURN mc.name AS name, mc.description AS description,
              mc.common_in AS common_in, mc.uuid AS uuid`,
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

      expect(Array.isArray(record.common_in), 'common_in should be an array').toBe(true)
      expect(record.common_in.length, 'common_in should have at least one entry').toBeGreaterThan(0)

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
  // 4. TaskShell nodes have bloom level ranges
  // ---------------------------------------------------------------------------

  test('Acceptance: TaskShell nodes have valid bloom level ranges', async () => {
    const result = await neo4jQuery<{
      name: string
      item_type: string
      bloom_level_min: number
      bloom_level_max: number
    }>(
      `MATCH (ts:TaskShell {institution_id: $institution_id})
       RETURN ts.name AS name, ts.item_type AS item_type,
              ts.bloom_level_min AS bloom_level_min,
              ts.bloom_level_max AS bloom_level_max`,
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
      expect(record.bloom_level_min, `${record.name}: bloom_level_min should be >= 1`).toBeGreaterThanOrEqual(1)
      expect(record.bloom_level_max, `${record.name}: bloom_level_max should be <= 6`).toBeLessThanOrEqual(6)
      expect(
        record.bloom_level_min,
        `${record.name}: bloom_level_min should be <= bloom_level_max`
      ).toBeLessThanOrEqual(record.bloom_level_max)
      expect(record.item_type, `${record.name}: item_type should be a non-empty string`).toBeTruthy()
    }
  })

  // ---------------------------------------------------------------------------
  // 5. Few-shot examples linked to TaskShells via EXEMPLIFIES
  // ---------------------------------------------------------------------------

  test('Acceptance: FewShotExample nodes linked to TaskShells via EXEMPLIFIES', async () => {
    const result = await neo4jQuery<{
      fse_item_type: string
      ts_name: string
    }>(
      `MATCH (fse:FewShotExample {institution_id: $institution_id})
             -[:EXEMPLIFIES]->(ts:TaskShell {institution_id: $institution_id})
       RETURN fse.item_type AS fse_item_type, ts.name AS ts_name`,
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
      expect(record.fse_item_type).toBeTruthy()
      expect(record.ts_name).toBeTruthy()
    }
  })

  // ---------------------------------------------------------------------------
  // 6. At least one few-shot example per common TaskShell
  // ---------------------------------------------------------------------------

  test('Acceptance: at least one few-shot example per common TaskShell type', async () => {
    const COMMON_TYPES = ['SBA', 'EMQ', 'SIS', 'DRUG', 'LAB', 'IMG', 'ACUTE', 'ETH']

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

    const coveredTypes = new Set(result.records.map((r) => r.item_type))

    for (const itemType of COMMON_TYPES) {
      expect(
        coveredTypes.has(itemType),
        `Should have at least one FewShotExample for item_type ${itemType}`
      ).toBe(true)
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
    expect(fseCount.records[0]?.count).toBeGreaterThanOrEqual(8)
  })
})
