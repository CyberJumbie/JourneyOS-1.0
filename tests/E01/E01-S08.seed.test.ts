/**
 * tests/E01/E01-S08.seed.test.ts — Acceptance tests for:
 *   09-msm-catalog, 10-hetionet, 11-drugbank, validate-seed
 *
 * Validates:
 *   1. 24 Course nodes from MSM catalog
 *   2. 10 ILO nodes with domain/text properties
 *   3. Courses with ILO references have HAS_ILO edges
 *   4. HetioNet Gene, Disease, Compound nodes exist
 *   5. Gene-Disease ASSOCIATES_WITH edges exist
 *   6. Compound-Disease TREATS edges exist
 *   7. DrugBank Drug and DrugTarget nodes exist
 *   8. Drug-DrugTarget TARGETS edges exist
 *   9. Drug-Drug INTERACTS_WITH edges exist
 *   10. Seeds are idempotent
 */

import { test, expect } from '@playwright/test'
import { neo4jQuery } from '../../packages/neo4j/client'

const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'
const ctx = { institution_id: INSTITUTION_ID }

test.describe('E01-S08: Seed MSM Catalog, HetioNet, DrugBank', () => {
  // ── 09: MSM Catalog ─────────────────────────────────────────────────────

  test('Acceptance: 24 Course nodes exist in Neo4j', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (c:Course {institution_id: $institution_id}) RETURN count(c) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBe(24)
  })

  test('Acceptance: 10 ILO nodes exist with required properties', async () => {
    const result = await neo4jQuery<{
      ilo_id: string
      domain: string
      text: string
      uuid: string
    }>(
      `MATCH (ilo:ILO {institution_id: $institution_id})
       RETURN ilo.ilo_id AS ilo_id, ilo.domain AS domain,
              ilo.text AS text, ilo.uuid AS uuid`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records.length).toBe(10)

    for (const record of result.records) {
      expect(record.ilo_id).toBeTruthy()
      expect(record.domain).toBeTruthy()
      expect(record.text).toBeTruthy()
      expect(record.uuid).toBeTruthy()
    }
  })

  test('Acceptance: courses with ILO references have HAS_ILO edges', async () => {
    const result = await neo4jQuery<{ courses_with_ilos: number }>(
      `MATCH (c:Course {institution_id: $institution_id})-[:HAS_ILO]->(ilo:ILO)
       RETURN count(DISTINCT c) AS courses_with_ilos`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    // At least some courses should have ILO edges (M3 clerkships have ILO references)
    expect(result.records[0]?.courses_with_ilos).toBeGreaterThanOrEqual(1)
  })

  test('Acceptance: Course nodes have required properties', async () => {
    const result = await neo4jQuery<{
      code: string
      name: string
      course_type: string
      credit_hours: number
    }>(
      `MATCH (c:Course {institution_id: $institution_id})
       RETURN c.code AS code, c.name AS name,
              c.course_type AS course_type, c.credit_hours AS credit_hours
       LIMIT 5`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    for (const record of result.records) {
      expect(record.code).toBeTruthy()
      expect(record.name).toBeTruthy()
      expect(record.course_type).toBeTruthy()
      expect(typeof record.credit_hours).toBe('number')
    }
  })

  // ── 10: HetioNet ────────────────────────────────────────────────────────

  test('Acceptance: HetioNet Gene nodes exist (>=50)', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (g:Gene {institution_id: $institution_id}) RETURN count(g) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBeGreaterThanOrEqual(50)
  })

  test('Acceptance: HetioNet Disease nodes exist (>=49)', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (d:Disease {institution_id: $institution_id}) RETURN count(d) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBeGreaterThanOrEqual(49)
  })

  test('Acceptance: HetioNet Compound nodes exist (>=30)', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (c:Compound {institution_id: $institution_id}) RETURN count(c) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBeGreaterThanOrEqual(30)
  })

  test('Acceptance: Gene→Disease ASSOCIATES_WITH edges exist (>=40)', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (:Gene {institution_id: $institution_id})-[:ASSOCIATES_WITH]->(:Disease {institution_id: $institution_id})
       RETURN count(*) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBeGreaterThanOrEqual(40)
  })

  test('Acceptance: Compound→Disease TREATS edges exist (>=30)', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (:Compound {institution_id: $institution_id})-[:TREATS]->(:Disease {institution_id: $institution_id})
       RETURN count(*) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBeGreaterThanOrEqual(30)
  })

  // ── 11: DrugBank ────────────────────────────────────────────────────────

  test('Acceptance: DrugBank Drug nodes exist (>=50)', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (d:Drug {institution_id: $institution_id}) RETURN count(d) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBeGreaterThanOrEqual(50)
  })

  test('Acceptance: DrugBank DrugTarget nodes exist (>=40)', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (t:DrugTarget {institution_id: $institution_id}) RETURN count(t) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBeGreaterThanOrEqual(40)
  })

  test('Acceptance: Drug→DrugTarget TARGETS edges exist (>=45)', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (:Drug {institution_id: $institution_id})-[:TARGETS]->(:DrugTarget {institution_id: $institution_id})
       RETURN count(*) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBeGreaterThanOrEqual(45)
  })

  test('Acceptance: Drug→Drug INTERACTS_WITH edges exist (>=10)', async () => {
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (:Drug {institution_id: $institution_id})-[:INTERACTS_WITH]->(:Drug {institution_id: $institution_id})
       RETURN count(*) AS count`,
      {},
      ctx
    )

    if (!result) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    expect(result.records[0]?.count).toBeGreaterThanOrEqual(10)
  })

  // ── Idempotency ─────────────────────────────────────────────────────────

  test('Acceptance: MSM catalog seed is idempotent', async () => {
    // Get counts before
    const beforeCourses = await neo4jQuery<{ count: number }>(
      `MATCH (c:Course {institution_id: $institution_id}) RETURN count(c) AS count`,
      {},
      ctx
    )
    const beforeILOs = await neo4jQuery<{ count: number }>(
      `MATCH (ilo:ILO {institution_id: $institution_id}) RETURN count(ilo) AS count`,
      {},
      ctx
    )

    if (!beforeCourses || !beforeILOs) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    // Run seed again
    const { seedMSMCatalog } = await import('../../scripts/seeds/09-msm-catalog')
    await seedMSMCatalog()

    // Get counts after
    const afterCourses = await neo4jQuery<{ count: number }>(
      `MATCH (c:Course {institution_id: $institution_id}) RETURN count(c) AS count`,
      {},
      ctx
    )
    const afterILOs = await neo4jQuery<{ count: number }>(
      `MATCH (ilo:ILO {institution_id: $institution_id}) RETURN count(ilo) AS count`,
      {},
      ctx
    )

    if (!afterCourses || !afterILOs) {
      throw new Error('Neo4j became unavailable during idempotency check')
    }
    expect(afterCourses.records[0]?.count).toBe(beforeCourses.records[0]?.count)
    expect(afterILOs.records[0]?.count).toBe(beforeILOs.records[0]?.count)
  })

  test('Acceptance: HetioNet seed is idempotent', async () => {
    const beforeGenes = await neo4jQuery<{ count: number }>(
      `MATCH (g:Gene {institution_id: $institution_id}) RETURN count(g) AS count`,
      {},
      ctx
    )

    if (!beforeGenes) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    const { seedHetionet } = await import('../../scripts/seeds/10-hetionet')
    await seedHetionet()

    const afterGenes = await neo4jQuery<{ count: number }>(
      `MATCH (g:Gene {institution_id: $institution_id}) RETURN count(g) AS count`,
      {},
      ctx
    )

    if (!afterGenes) {
      throw new Error('Neo4j became unavailable during idempotency check')
    }
    expect(afterGenes.records[0]?.count).toBe(beforeGenes.records[0]?.count)
  })

  test('Acceptance: DrugBank seed is idempotent', async () => {
    const beforeDrugs = await neo4jQuery<{ count: number }>(
      `MATCH (d:Drug {institution_id: $institution_id}) RETURN count(d) AS count`,
      {},
      ctx
    )

    if (!beforeDrugs) {
      console.warn('Neo4j unavailable — skipping')
      test.skip()
      return
    }

    const { seedDrugbank } = await import('../../scripts/seeds/11-drugbank')
    await seedDrugbank()

    const afterDrugs = await neo4jQuery<{ count: number }>(
      `MATCH (d:Drug {institution_id: $institution_id}) RETURN count(d) AS count`,
      {},
      ctx
    )

    if (!afterDrugs) {
      throw new Error('Neo4j became unavailable during idempotency check')
    }
    expect(afterDrugs.records[0]?.count).toBe(beforeDrugs.records[0]?.count)
  })
})
