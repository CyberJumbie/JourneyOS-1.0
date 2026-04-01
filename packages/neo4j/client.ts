/**
 * packages/neo4j/client.ts — neo4jQuery wrapper (THE canonical C05 pattern)
 *
 * THIS IS THE ONLY WAY to query Neo4j in Journey OS.
 *
 * import { neo4jQuery } from '@journey/neo4j/client'
 * const result = await neo4jQuery(cypher, params, ctx)
 *
 * - Always injects institution_id into params (tenant isolation — C05)
 * - Returns null on any failure (graceful degradation — Rule 6 / G08)
 * - Session always closed in finally block
 * - Logs queries in development mode
 */

import { getDriver } from './driver'
import neo4j from 'neo4j-driver'

/**
 * Recursively convert Neo4j Integer objects to JS numbers.
 * Neo4j driver returns { low: N, high: 0 } for integers, which breaks
 * equality checks, JSON serialization, and arithmetic.
 */
function convertNeo4jIntegers(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (neo4j.isInt(obj)) return neo4j.integer.toNumber(obj)
  if (Array.isArray(obj)) return obj.map(convertNeo4jIntegers)
  if (typeof obj === 'object') {
    const converted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      converted[key] = convertNeo4jIntegers(value)
    }
    return converted
  }
  return obj
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Request context — every neo4jQuery call requires this for tenant isolation. */
export interface RequestContext {
  /** The institution UUID — injected into every Cypher query as $institution_id */
  institution_id: string
  /** Optional actor (user) UUID — for audit logging */
  actor_id?: string
}

/** Typed result from neo4jQuery. null means Neo4j was unavailable. */
export interface Neo4jQueryResult<T = Record<string, unknown>> {
  records: T[]
  summary: {
    countersUpdated: boolean
  }
}

// ---------------------------------------------------------------------------
// Reference node labels that are global (no institution_id filter needed).
// We still inject institution_id into params for consistency, but these labels
// are shared across all institutions.
// ---------------------------------------------------------------------------
const REFERENCE_NODE_LABELS = new Set([
  'BloomLevel',
  'MillerLevel',
  'USMLE_System',
  'USMLE_Topic',
  'USMLE_Subtopic',
  'LCMEContentDomain',
  'LCME_Standard',
  'MisconceptionCategory',
  'TaskShell',
  'CarePhase',
  // Phase 3-4 seed node types
  'AnatomyRegion',
  'FewShotExample',
  'DifficultyBand',
  'SessionType',
  'LeadInType',
  'ClinicalSetting',
  'PatientAgeGroup',
  'PatientSex',
  'AssessmentMode',
  'ResourceType',
  'IPEC_Competency',
  'IPEC_SubCompetency',
  'LCME_Element',
  'Course',
  'ILO',
  // HetioNet / DrugBank reference nodes
  'Gene',
  'Disease',
  'Compound',
  'Drug',
  'DrugTarget',
])

/**
 * Heuristic check: does this Cypher query mention a reference node label?
 * Used to suppress the institution_id warning for global taxonomy queries.
 * WARNING: This is a heuristic only — NEVER use for access control decisions.
 */
function containsReferenceLabel(cypher: string): boolean {
  for (const label of REFERENCE_NODE_LABELS) {
    if (cypher.includes(`:${label}`)) return true
  }
  return false
}

// ---------------------------------------------------------------------------
// neo4jQuery — THE canonical query function
// ---------------------------------------------------------------------------

/**
 * Execute a Cypher query with automatic tenant isolation.
 *
 * @param cypher  - The Cypher query string. Use $institution_id for tenant filtering.
 * @param params  - Query parameters (institution_id is injected automatically).
 * @param ctx     - Request context with institution_id (and optional actor_id).
 * @returns       - Neo4jQueryResult<T> on success, null on failure/unavailability.
 *
 * @example
 * ```ts
 * const result = await neo4jQuery<{ name: string }>(
 *   'MATCH (sc:SubConcept {institution_id: $institution_id}) RETURN sc.name AS name',
 *   {},
 *   { institution_id: 'inst-001' }
 * )
 * if (result) {
 *   result.records.forEach(r => console.log(r.name))
 * }
 * ```
 */
export async function neo4jQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {},
  ctx: RequestContext
): Promise<Neo4jQueryResult<T> | null> {
  // Validate institution_id
  if (!ctx.institution_id && !containsReferenceLabel(cypher)) {
    console.warn(
      '[neo4j] WARNING: neo4jQuery called without institution_id on a non-reference query. ' +
      'This may indicate a tenant isolation gap (C05).'
    )
  }

  // Get the singleton driver
  const driver = getDriver()
  if (!driver) {
    console.warn('[neo4j] Driver unavailable — graceful degradation (returning null)')
    return null
  }

  const session = driver.session()
  try {
    // CRITICAL: Always inject institution_id for tenant isolation (C05)
    const injectedParams = {
      ...params,
      institution_id: ctx.institution_id,
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[neo4j] Query:', cypher.slice(0, 120).replace(/\s+/g, ' '))
      if (ctx.actor_id) {
        console.log('[neo4j] Actor:', ctx.actor_id)
      }
    }

    const result = await session.run(cypher, injectedParams)

    return {
      records: result.records.map((r) => convertNeo4jIntegers(r.toObject()) as T),
      summary: {
        countersUpdated: result.summary.counters.containsUpdates(),
      },
    }
  } catch (error) {
    // RULE 6 (G08): Neo4j failure NEVER blocks the user — return null
    console.error('[neo4j] Query failed — graceful degradation:', error)
    return null
  } finally {
    await session.close()
  }
}
