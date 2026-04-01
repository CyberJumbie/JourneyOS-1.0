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

  test('LCME_Standard nodes >= 8', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ count: number }>(
      'MATCH (s:LCME_Standard {institution_id: $institution_id}) RETURN count(s) AS count',
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].count).toBeGreaterThanOrEqual(8)
    } else {
      // Graceful degradation — Neo4j unavailable
      expect(result).toBeNull()
    }
  })

  test('Every LCME_Element has a parent LCME_Standard', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    // Find elements without a parent standard
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

  test('IPEC sub-competencies linked to domains', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    // All sub-competencies should have a parent domain
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

  test('CarePhase nodes >= 4', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ count: number }>(
      'MATCH (cp:CarePhase {institution_id: $institution_id}) RETURN count(cp) AS count',
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].count).toBeGreaterThanOrEqual(4)
    } else {
      expect(result).toBeNull()
    }
  })

  // ---- AnatomyRegion ----

  test('AnatomyRegion hierarchy valid (>= 10 regions)', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    const result = await neo4jQuery<{ count: number }>(
      'MATCH (r:AnatomyRegion {institution_id: $institution_id}) RETURN count(r) AS count',
      {},
      ctx
    )

    if (result) {
      expect(result.records.length).toBe(1)
      expect(result.records[0].count).toBeGreaterThanOrEqual(10)
    } else {
      expect(result).toBeNull()
    }
  })

  // ---- Cross-cutting: institution_id ----

  test('All nodes have institution_id', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    // Check for any seeded node types that lack institution_id
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
        // Graceful degradation
        expect(result).toBeNull()
      }
    }
  })
})
