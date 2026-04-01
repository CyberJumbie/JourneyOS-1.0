/**
 * packages/neo4j/index.ts — Barrel export (public API)
 *
 * This is the ONLY import path for Neo4j functionality in Journey OS.
 * Driver internals (getDriver, closeDriver) are NOT exported — internal only.
 *
 * Usage:
 *   import { neo4jQuery, type RequestContext, type Neo4jQueryResult } from '@journey/neo4j'
 *   import { createSameAsIfSafe } from '@journey/neo4j'
 */

// Client — the canonical neo4jQuery wrapper (C05)
export { neo4jQuery } from './client'
export type { Neo4jQueryResult, RequestContext } from './client'

// SAME_AS — safe edge creation with cycle detection (C09)
export { createSameAsIfSafe } from './same-as'
export type { SameAsProperties, SameAsResult } from './same-as'
