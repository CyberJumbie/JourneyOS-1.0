import type { APIRequestContext } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Assert Neo4j graph state using the test-only Cypher endpoint.
 * Only MATCH queries allowed. Returns 404 in production.
 */
export async function assertNeo4j(
  request: APIRequestContext,
  cypher: string,
  params: Record<string, unknown> = {},
  expectedCount?: number,
  institutionId = 'DEV-INSTITUTION-00000000'
): Promise<Record<string, unknown>[]> {
  if (!cypher.trim().toUpperCase().startsWith('MATCH')) {
    throw new Error('assertNeo4j: only MATCH queries allowed')
  }
  const res = await request.post('/app/api/test/cypher', {
    headers: { 'x-test-mode': 'true' },
    data: { cypher, params, institution_id: institutionId }
  })
  if (!res.ok()) throw new Error(`assertNeo4j failed: ${res.status()} ${await res.text()}`)
  const { records } = await res.json()
  if (expectedCount !== undefined) {
    expect(records.length, `Expected ${expectedCount} Neo4j records, got ${records.length}`).toBe(expectedCount)
  }
  return records
}

/**
 * Assert a specific Neo4j edge exists between two nodes.
 */
export async function assertEdgeExists(
  request: APIRequestContext,
  fromUuid: string,
  edgeType: string,
  toUuid: string,
  institutionId = 'DEV-INSTITUTION-00000000'
): Promise<void> {
  const records = await assertNeo4j(request,
    `MATCH (a {uuid: $fromUuid})-[r:${edgeType}]->(b {uuid: $toUuid}) RETURN r`,
    { fromUuid, toUuid },
    undefined,
    institutionId
  )
  if (records.length === 0) {
    throw new Error(`Edge (${fromUuid})-[:${edgeType}]->(${toUuid}) not found in Neo4j`)
  }
}
