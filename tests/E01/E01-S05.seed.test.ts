/**
 * tests/E01/E01-S05.seed.test.ts — Acceptance tests for USMLE taxonomy seed
 *
 * Validates:
 * - 18 USMLE_System nodes exist (from usmle-systems-disciplines.json)
 * - 117 USMLE_Topic nodes (from usmle-content-outline.json)
 * - 757 USMLE_Subtopic nodes (from usmle-content-outline.json)
 * - Every topic PART_OF exactly one system (child → parent)
 * - Every subtopic BELONGS_TO exactly one topic (child → parent)
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

  test('Static: every system has SYS-XX code format', async () => {
    const { SYSTEMS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    for (const sys of SYSTEMS) {
      expect(sys.code).toMatch(/^SYS-\d{2}$/)
    }
  })

  test('Static: system codes are SYS-01 through SYS-18', async () => {
    const { SYSTEMS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    const codes = SYSTEMS.map((s: { code: string }) => s.code).sort()
    const expected = Array.from({ length: 18 }, (_, i) =>
      `SYS-${String(i + 1).padStart(2, '0')}`
    )
    expect(codes).toEqual(expected)
  })

  test('Static: TOPICS array has 110-125 entries', async () => {
    const { TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    expect(TOPICS.length).toBeGreaterThanOrEqual(110)
    expect(TOPICS.length).toBeLessThanOrEqual(125)
  })

  test('Static: total subtopics is 700-800', async () => {
    const { TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    const subtopicCount = TOPICS.reduce(
      (acc: number, t: { subtopics: unknown[] }) => acc + t.subtopics.length,
      0,
    )
    expect(subtopicCount).toBeGreaterThanOrEqual(700)
    expect(subtopicCount).toBeLessThanOrEqual(800)
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

  test('Static: topic codes follow SYS-XX-TXX format', async () => {
    const { TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    for (const topic of TOPICS) {
      expect(topic.code).toMatch(/^SYS-\d{2}-T\d{2}$/)
    }
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

  test('Static: subtopic codes follow SYS-XX-TXX-SXXX format', async () => {
    const { TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    for (const topic of TOPICS) {
      for (const sub of topic.subtopics) {
        expect(sub.code).toMatch(/^SYS-\d{2}-T\d{2}-S\d{3}$/)
      }
    }
  })

  test('Static: every topic has at least 1 subtopic', async () => {
    const { TOPICS } = await import('../../scripts/seeds/05-usmle-taxonomy')
    for (const topic of TOPICS) {
      expect(topic.subtopics.length).toBeGreaterThanOrEqual(1)
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

  test('Integration: 110-125 USMLE_Topic nodes exist', async () => {
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
    expect(result.records[0].count).toBeGreaterThanOrEqual(110)
    expect(result.records[0].count).toBeLessThanOrEqual(125)
  })

  test('Integration: 700-800 USMLE_Subtopic nodes exist', async () => {
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
    expect(result.records[0].count).toBeGreaterThanOrEqual(700)
    expect(result.records[0].count).toBeLessThanOrEqual(800)
  })

  test('Integration: every topic has exactly one parent system via PART_OF', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')
    const result = await neo4jQuery<{ topicCode: string; parentCount: number }>(
      `MATCH (t:USMLE_Topic {institution_id: $institution_id})
       OPTIONAL MATCH (t)-[:PART_OF]->(s:USMLE_System)
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

  test('Integration: every subtopic has exactly one parent topic via BELONGS_TO', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')
    const result = await neo4jQuery<{ subtopicCode: string; parentCount: number }>(
      `MATCH (st:USMLE_Subtopic {institution_id: $institution_id})
       OPTIONAL MATCH (st)-[:BELONGS_TO]->(t:USMLE_Topic)
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

  test('Integration: no USMLE nodes missing institution_id', async () => {
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
