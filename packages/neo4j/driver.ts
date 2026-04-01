/**
 * packages/neo4j/driver.ts — Singleton Neo4j driver with globalThis for HMR
 *
 * INTERNAL ONLY — never import this file from outside packages/neo4j/.
 * ESLint AP-01 bans importing from this file or from 'neo4j-driver' directly.
 * Use @journey/neo4j/client (neo4jQuery) instead.
 */

import neo4j, { type Driver } from 'neo4j-driver'

const NEO4J_GLOBAL_KEY = '__journey_neo4j_driver__' as const
const DEFAULT_MAX_POOL_SIZE = 20
const AURA_TIMEOUT_MS = 30_000 // 30s — accommodates Aura wake-up from pause

/**
 * Store driver on globalThis to survive Next.js HMR in development.
 * In production, module-level singleton is sufficient.
 */
function getGlobalDriver(): Driver | null {
  return (globalThis as Record<string, unknown>)[NEO4J_GLOBAL_KEY] as Driver | null ?? null
}

function setGlobalDriver(driver: Driver): void {
  ;(globalThis as Record<string, unknown>)[NEO4J_GLOBAL_KEY] = driver
}

/**
 * Lazily initializes and returns the Neo4j driver singleton.
 * Returns null if NEO4J_URI is not set (graceful degradation).
 *
 * Config:
 * - NEO4J_URI: bolt+s://... connection URI
 * - NEO4J_USERNAME: database username
 * - NEO4J_PASSWORD: database password
 * - NEO4J_MAX_POOL_SIZE: max connection pool size (default 20)
 */
export function getDriver(): Driver | null {
  const uri = process.env.NEO4J_URI
  if (!uri) {
    return null
  }

  // Check globalThis first (survives HMR)
  const existing = getGlobalDriver()
  if (existing) {
    return existing
  }

  const username = process.env.NEO4J_USERNAME
  const password = process.env.NEO4J_PASSWORD

  if (!username || !password) {
    console.warn('[neo4j] NEO4J_USERNAME or NEO4J_PASSWORD not set — driver unavailable')
    return null
  }

  const maxPoolSize = parseInt(process.env.NEO4J_MAX_POOL_SIZE ?? String(DEFAULT_MAX_POOL_SIZE), 10)

  const driver = neo4j.driver(
    uri,
    neo4j.auth.basic(username, password),
    {
      maxConnectionPoolSize: maxPoolSize,
      connectionAcquisitionTimeout: AURA_TIMEOUT_MS,
      connectionTimeout: AURA_TIMEOUT_MS,
      logging: process.env.NODE_ENV === 'development'
        ? { level: 'warn', logger: (level, message) => console.log(`[neo4j:${level}] ${message}`) }
        : undefined,
    }
  )

  setGlobalDriver(driver)

  if (process.env.NODE_ENV === 'development') {
    console.log(`[neo4j] Driver initialized — pool size: ${maxPoolSize}`)
  }

  return driver
}

/**
 * Gracefully close the driver and clear the singleton.
 * Call this on server shutdown / test teardown.
 */
export async function closeDriver(): Promise<void> {
  const driver = getGlobalDriver()
  if (driver) {
    await driver.close()
    ;(globalThis as Record<string, unknown>)[NEO4J_GLOBAL_KEY] = undefined
    if (process.env.NODE_ENV === 'development') {
      console.log('[neo4j] Driver closed')
    }
  }
}
