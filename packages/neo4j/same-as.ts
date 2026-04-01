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

const SAME_AS_MAX_CYCLE_DEPTH = 5

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
// createSameAsIfSafe — atomic cycle-check + create in a single Cypher query
// ---------------------------------------------------------------------------

/**
 * Create a SAME_AS edge between two nodes if it's safe (no cycle, correct direction).
 *
 * Direction convention: lower UUID string → higher UUID string (canonical).
 * Cycle check + create are a SINGLE Cypher query to prevent TOCTOU races.
 *
 * @param fromUuid    - UUID of the first node
 * @param toUuid      - UUID of the second node
 * @param properties  - Edge properties (source, confidence, etc.)
 * @param ctx         - Request context with institution_id
 * @returns           - SameAsResult indicating success/failure with reason
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

  const edgeProps = {
    source: properties.source,
    confidence: properties.confidence ?? null,
    created_at: properties.created_at ?? new Date().toISOString(),
  }

  // Atomic cycle-check + create in a single query (prevents TOCTOU race)
  const result = await neo4jQuery<{ action: string }>(
    `
    MATCH (a {uuid: $low_uuid}), (b {uuid: $high_uuid})
    WHERE (a.institution_id = $institution_id OR a:StandardTerm)
      AND (b.institution_id = $institution_id OR b:StandardTerm)
    // Check for existing path that would form a cycle
    OPTIONAL MATCH cyclePath = (b)-[:SAME_AS*1..${SAME_AS_MAX_CYCLE_DEPTH}]->(a)
    WITH a, b, cyclePath
    WHERE cyclePath IS NULL
    MERGE (a)-[r:SAME_AS]->(b)
    ON CREATE SET r = $edge_props
    ON MATCH SET r.updated_at = datetime()
    RETURN CASE WHEN cyclePath IS NOT NULL THEN 'cycle' ELSE 'ok' END AS action
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

  if (result.records.length === 0) {
    return { created: false, reason: 'Nodes not found or cycle detected' }
  }

  return {
    created: result.summary.countersUpdated,
    reason: result.summary.countersUpdated ? undefined : 'Edge already existed (MERGE was no-op)',
  }
}
