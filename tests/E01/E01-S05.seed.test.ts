/**
 * tests/E01/E01-S05.seed.test.ts — Acceptance tests for USMLE taxonomy seed
 *
 * Validates:
 * - 18 USMLE_System nodes exist
 * - ~100 USMLE_Topic nodes (>=90, <=120)
 * - ~400 USMLE_Subtopic nodes (>=350, <=450)
 * - Every topic has exactly one parent system (HAS_TOPIC)
 * - Every subtopic has exactly one parent topic (HAS_SUBTOPIC)
 * - All nodes have institution_id
 * - Seed is idempotent (running twice produces same counts)
 */

import { test, expect } from '@playwright/test'

const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'

test.describe('E01-S05: USMLE Taxonomy Seed', () => {
  // ─── Static data structure tests (no Neo4j needed) ───

  test('Static: SYSTEMS array has exactly 18 entries', async () => {
    const { SYSTEMS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    expect(SYSTEMS).toHaveLength(18)
  })

  test('Static: TOPICS array has 90-120 entries', async () => {
    const { TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    expect(TOPICS.length).toBeGreaterThanOrEqual(90)
    expect(TOPICS.length).toBeLessThanOrEqual(120)
  })

  test('Static: total subtopics is 350-450', async () => {
    const { TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    const subtopicCount = TOPICS.reduce(
      (acc: number, t: { subtopics: unknown[] }) => acc + t.subtopics.length,
      0,
    )
    expect(subtopicCount).toBeGreaterThanOrEqual(350)
    expect(subtopicCount).toBeLessThanOrEqual(450)
  })

  test('Static: every topic references a valid system code', async () => {
    const { SYSTEMS, TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    const systemCodes = new Set(SYSTEMS.map((s: { code: string }) => s.code))
    for (const topic of TOPICS) {
      expect(systemCodes.has(topic.systemCode)).toBe(true)
    }
  })

  test('Static: every system has at least one topic', async () => {
    const { SYSTEMS, TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    const systemCodesWithTopics = new Set(
      TOPICS.map((t: { systemCode: string }) => t.systemCode),
    )
    for (const sys of SYSTEMS) {
      expect(systemCodesWithTopics.has(sys.code)).toBe(true)
    }
  })

  test('Static: all topic codes are unique', async () => {
    const { TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    const codes = TOPICS.map((t: { code: string }) => t.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  test('Static: all subtopic codes are unique', async () => {
    const { TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    const codes: string[] = []
    for (const topic of TOPICS) {
      for (const sub of topic.subtopics) {
        codes.push(sub.code)
      }
    }
    expect(new Set(codes).size).toBe(codes.length)
  })

  test('Static: every topic has 3-6 subtopics', async () => {
    const { TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    for (const topic of TOPICS) {
      expect(topic.subtopics.length).toBeGreaterThanOrEqual(3)
      expect(topic.subtopics.length).toBeLessThanOrEqual(6)
    }
  })

  // ─── Neo4j integration tests (require live Neo4j) ───

  test('Integration: 18 USMLE_System nodes exist', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')
    const result = await neo4jQuery<{ count: number }>(
      'MATCH (s:USMLE_System {institution_id: $institution_id}) RETURN count(s) AS count',
      {},
      { institution_id: INSTITUTION_ID },
    )
    if (!result) {
      test.skip()
      return
    }
    expect(result.records[0].count).toBe(18)
  })

  test('Integration: 90-120 USMLE_Topic nodes exist', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')
    const result = await neo4jQuery<{ count: number }>(
      'MATCH (t:USMLE_Topic {institution_id: $institution_id}) RETURN count(t) AS count',
      {},
      { institution_id: INSTITUTION_ID },
    )
    if (!result) {
      test.skip()
      return
    }
    expect(result.records[0].count).toBeGreaterThanOrEqual(90)
    expect(result.records[0].count).toBeLessThanOrEqual(120)
  })

  test('Integration: 350-450 USMLE_Subtopic nodes exist', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')
    const result = await neo4jQuery<{ count: number }>(
      'MATCH (st:USMLE_Subtopic {institution_id: $institution_id}) RETURN count(st) AS count',
      {},
      { institution_id: INSTITUTION_ID },
    )
    if (!result) {
      test.skip()
      return
    }
    expect(result.records[0].count).toBeGreaterThanOrEqual(350)
    expect(result.records[0].count).toBeLessThanOrEqual(450)
  })

  test('Integration: every topic has exactly one parent system via HAS_TOPIC', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')
    const result = await neo4jQuery<{ topicCode: string; parentCount: number }>(
      `MATCH (t:USMLE_Topic {institution_id: $institution_id})
       OPTIONAL MATCH (s:USMLE_System)-[:HAS_TOPIC]->(t)
       RETURN t.code AS topicCode, count(s) AS parentCount`,
      {},
      { institution_id: INSTITUTION_ID },
    )
    if (!result) {
      test.skip()
      return
    }
    for (const record of result.records) {
      expect(record.parentCount).toBe(1)
    }
  })

  test('Integration: every subtopic has exactly one parent topic via HAS_SUBTOPIC', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')
    const result = await neo4jQuery<{ subtopicCode: string; parentCount: number }>(
      `MATCH (st:USMLE_Subtopic {institution_id: $institution_id})
       OPTIONAL MATCH (t:USMLE_Topic)-[:HAS_SUBTOPIC]->(st)
       RETURN st.code AS subtopicCode, count(t) AS parentCount`,
      {},
      { institution_id: INSTITUTION_ID },
    )
    if (!result) {
      test.skip()
      return
    }
    for (const record of result.records) {
      expect(record.parentCount).toBe(1)
    }
  })

  test('Integration: all nodes have institution_id', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')
    const result = await neo4jQuery<{ count: number }>(
      `MATCH (n)
       WHERE (n:USMLE_System OR n:USMLE_Topic OR n:USMLE_Subtopic)
         AND n.institution_id IS NULL
       RETURN count(n) AS count`,
      {},
      { institution_id: INSTITUTION_ID },
    )
    if (!result) {
      test.skip()
      return
    }
    expect(result.records[0].count).toBe(0)
  })

  test('Integration: seed is idempotent (running twice gives same counts)', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    // Get counts before (seed should already have been run once)
    const before = await neo4jQuery<{ sys: number; top: number; sub: number }>(
      `MATCH (s:USMLE_System {institution_id: $institution_id})
       WITH count(s) AS sys
       MATCH (t:USMLE_Topic {institution_id: $institution_id})
       WITH sys, count(t) AS top
       MATCH (st:USMLE_Subtopic {institution_id: $institution_id})
       RETURN sys, top, count(st) AS sub`,
      {},
      { institution_id: INSTITUTION_ID },
    )
    if (!before) {
      test.skip()
      return
    }

    // Run seed again
    const { seedUsmle } = await import('../../scripts/seeds/05-usmle-taxonomy')
    await seedUsmle()

    // Get counts after
    const after = await neo4jQuery<{ sys: number; top: number; sub: number }>(
      `MATCH (s:USMLE_System {institution_id: $institution_id})
       WITH count(s) AS sys
       MATCH (t:USMLE_Topic {institution_id: $institution_id})
       WITH sys, count(t) AS top
       MATCH (st:USMLE_Subtopic {institution_id: $institution_id})
       RETURN sys, top, count(st) AS sub`,
      {},
      { institution_id: INSTITUTION_ID },
    )

    if (!after) {
      test.skip()
      return
    }
    expect(after.records[0].sys).toBe(before.records[0].sys)
    expect(after.records[0].top).toBe(before.records[0].top)
    expect(after.records[0].sub).toBe(before.records[0].sub)
  })
})
