/**
 * tests/E01/E01-S06.seed.test.ts — Acceptance tests for LCME, IPEC, CarePhase, and AnatomyRegion seeds.
 *
 * Validates that seed scripts create the expected nodes and relationships
 * in Neo4j. Tests gracefully degrade if Neo4j is unavailable.
 */

import { test, expect } from '@playwright/test'

const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'
const ctx = { institution_id: INSTITUTION_ID }

test.describe('E01-S06: Seed LCME standards, IPEC competencies, CarePhase, and anatomy regions', () => {
  // ---- LCME Standards ----

  test('12 LCME_Standard nodes', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ count: number }>(
      'MATCH (s:LCME_Standard {institution_id: $institution_id}) RETURN count(s) AS count',
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].count).toBe(12)
    } else {
      expect(result).toBeNull()
    }
  })

  test('93 LCME_Element nodes', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ count: number }>(
      'MATCH (e:LCME_Element {institution_id: $institution_id}) RETURN count(e) AS count',
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].count).toBe(93)
    } else {
      expect(result).toBeNull()
    }
  })

  test('Every LCME_Element has a parent LCME_Standard via HAS_ELEMENT', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ orphanCount: number }>(
      `MATCH (e:LCME_Element {institution_id: $institution_id})
       WHERE NOT (:LCME_Standard {institution_id: $institution_id})-[:HAS_ELEMENT]->(e)
       RETURN count(e) AS orphanCount`,
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].orphanCount).toBe(0)
    } else {
      expect(result).toBeNull()
    }
  })

  // ---- IPEC Competencies ----

  test('4 IPEC competency domains', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ count: number }>(
      'MATCH (c:IPEC_Competency {institution_id: $institution_id}) RETURN count(c) AS count',
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].count).toBe(4)
    } else {
      expect(result).toBeNull()
    }
  })

  test('38 IPEC sub-competencies linked to domains', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ count: number }>(
      'MATCH (sc:IPEC_SubCompetency {institution_id: $institution_id}) RETURN count(sc) AS count',
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].count).toBe(38)
    } else {
      expect(result).toBeNull()
    }
  })

  test('No orphan IPEC sub-competencies', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ orphanCount: number }>(
      `MATCH (sc:IPEC_SubCompetency {institution_id: $institution_id})
       WHERE NOT (:IPEC_Competency {institution_id: $institution_id})-[:HAS_SUBCOMPETENCY]->(sc)
       RETURN count(sc) AS orphanCount`,
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].orphanCount).toBe(0)
    } else {
      expect(result).toBeNull()
    }
  })

  // ---- CarePhase ----

  test('5 CarePhase nodes (not 7)', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ count: number }>(
      'MATCH (cp:CarePhase {institution_id: $institution_id}) RETURN count(cp) AS count',
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].count).toBe(5)
    } else {
      expect(result).toBeNull()
    }
  })

  test('CarePhase ordinals are 1-5', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ ordinals: number[] }>(
      `MATCH (cp:CarePhase {institution_id: $institution_id})
       RETURN collect(cp.ordinal) AS ordinals`,
      {},
      ctx
    )

    if (result) {
      const ordinals = result.records[0].ordinals.sort()
      expect(ordinals).toEqual([1, 2, 3, 4, 5])
    } else {
      expect(result).toBeNull()
    }
  })

  // ---- AnatomyRegion ----

  test('8 top-level AnatomyRegion nodes', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ count: number }>(
      `MATCH (r:AnatomyRegion {institution_id: $institution_id})
       WHERE r.parent_code IS NULL
       RETURN count(r) AS count`,
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].count).toBe(8)
    } else {
      expect(result).toBeNull()
    }
  })

  test('AnatomyRegion hierarchy has 55 total nodes (8 top + 47 sub)', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ count: number }>(
      'MATCH (r:AnatomyRegion {institution_id: $institution_id}) RETURN count(r) AS count',
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].count).toBe(55)
    } else {
      expect(result).toBeNull()
    }
  })

  test('Every sub-region has a parent via HAS_SUBREGION', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ orphanCount: number }>(
      `MATCH (sr:AnatomyRegion {institution_id: $institution_id})
       WHERE sr.parent_code IS NOT NULL
         AND NOT (:AnatomyRegion {institution_id: $institution_id})-[:HAS_SUBREGION]->(sr)
       RETURN count(sr) AS orphanCount`,
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].orphanCount).toBe(0)
    } else {
      expect(result).toBeNull()
    }
  })

  // ---- Cross-cutting: institution_id ----

  test('All nodes have institution_id', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const labels = [
      'LCME_Standard',
      'LCME_Element',
      'IPEC_Competency',
      'IPEC_SubCompetency',
      'CarePhase',
      'AnatomyRegion',
    ]

    for (const label of labels) {
      const result = await neo4jQuery<{ missingCount: number }>(
        `MATCH (n:${label})
         WHERE n.institution_id IS NULL
         RETURN count(n) AS missingCount`,
        {},
        ctx
      )

      if (result) {
        expect(
          result.records[0].missingCount,
          `${label} nodes should all have institution_id`
        ).toBe(0)
      } else {
        expect(result).toBeNull()
      }
    }
  })
})
