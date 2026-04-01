/**
 * packages/neo4j/same-as.ts — SAME_AS edge utilities (C09)
 *
 * SAME_AS edges link equivalent entities across data sources (e.g., UMLS CUI
 * to HetioNet compound). Safety checks prevent cycles and enforce consistent
 * direction (lower UUID string -> higher UUID string).
 *
 * Uses neo4jQuery internally (dogfooding — Rule 1 / C05).
 */

import { neo4jQuery, type RequestContext } from './client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SameAsProperties {
  /** Source of the equivalence assertion (e.g., 'umls', 'hetionet', 'manual') */
  source: string
  /** Confidence score 0.0-1.0 */
  confidence?: number
  /** ISO timestamp of when the link was created */
  created_at?: string
  /** Additional metadata */
  [key: string]: unknown
}

export interface SameAsResult {
  created: boolean
  reason?: string
}

// ---------------------------------------------------------------------------
// Direction convention: lower UUID string → higher UUID string
// ---------------------------------------------------------------------------

function orderUuids(a: string, b: string): [string, string] {
  return a.localeCompare(b) <= 0 ? [a, b] : [b, a]
}

// ---------------------------------------------------------------------------
// Cycle detection
// ---------------------------------------------------------------------------

/**
 * Check if creating a SAME_AS edge between fromUuid and toUuid would create a cycle.
 * Traverses existing SAME_AS paths at depth 1-5.
 */
async function wouldCreateCycle(
  fromUuid: string,
  toUuid: string,
  ctx: RequestContext
): Promise<boolean> {
  const result = await neo4jQuery<{ pathExists: boolean }>(
    `
    MATCH path = (a {uuid: $from_uuid})-[:SAME_AS*1..5]-(b {uuid: $to_uuid})
    WHERE a.institution_id = $institution_id OR a:StandardTerm
    RETURN count(path) > 0 AS pathExists
    LIMIT 1
    `,
    { from_uuid: fromUuid, to_uuid: toUuid },
    ctx
  )

  if (!result) {
    // Neo4j unavailable — be conservative, assume cycle to avoid corruption
    return true
  }

  if (result.records.length === 0) {
    return false
  }

  return result.records[0].pathExists === true
}

// ---------------------------------------------------------------------------
// createSameAsIfSafe
// ---------------------------------------------------------------------------

/**
 * Create a SAME_AS edge between two nodes if it's safe (no cycle, correct direction).
 *
 * Direction convention: lower UUID string → higher UUID string (canonical).
 * Cycle check: traversal depth 1-5 before creating.
 *
 * @param fromUuid    - UUID of the first node
 * @param toUuid      - UUID of the second node
 * @param properties  - Edge properties (source, confidence, etc.)
 * @param ctx         - Request context with institution_id
 * @returns           - SameAsResult indicating success/failure with reason
 *
 * @example
 * ```ts
 * const result = await createSameAsIfSafe(
 *   'uuid-concept-a',
 *   'uuid-concept-b',
 *   { source: 'umls', confidence: 0.95 },
 *   { institution_id: 'inst-001' }
 * )
 * if (result.created) console.log('SAME_AS edge created')
 * ```
 */
export async function createSameAsIfSafe(
  fromUuid: string,
  toUuid: string,
  properties: SameAsProperties,
  ctx: RequestContext
): Promise<SameAsResult> {
  // Self-link guard
  if (fromUuid === toUuid) {
    return { created: false, reason: 'Cannot create SAME_AS edge to self' }
  }

  // Enforce canonical direction: lower UUID → higher UUID
  const [lowUuid, highUuid] = orderUuids(fromUuid, toUuid)

  // Cycle check
  const hasCycle = await wouldCreateCycle(lowUuid, highUuid, ctx)
  if (hasCycle) {
    return {
      created: false,
      reason: `SAME_AS cycle detected between ${lowUuid} and ${highUuid} (depth 1-5)`,
    }
  }

  // Create the edge (MERGE to be idempotent)
  const edgeProps = {
    ...properties,
    created_at: properties.created_at ?? new Date().toISOString(),
  }

  const result = await neo4jQuery(
    `
    MATCH (a {uuid: $low_uuid}), (b {uuid: $high_uuid})
    WHERE (a.institution_id = $institution_id OR a:StandardTerm)
      AND (b.institution_id = $institution_id OR b:StandardTerm)
    MERGE (a)-[r:SAME_AS]->(b)
    SET r += $edge_props
    RETURN r
    `,
    {
      low_uuid: lowUuid,
      high_uuid: highUuid,
      edge_props: edgeProps,
    },
    ctx
  )

  if (!result) {
    return { created: false, reason: 'Neo4j unavailable — graceful degradation' }
  }

  return {
    created: result.summary.countersUpdated,
    reason: result.summary.countersUpdated ? undefined : 'Edge already existed (MERGE was no-op)',
  }
}
