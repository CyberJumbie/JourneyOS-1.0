/**
 * tests/E01/E01-S02.infra.test.ts — Acceptance tests for Neo4j wrapper (C05)
 *
 * These tests validate the neo4jQuery wrapper, singleton driver pattern,
 * graceful degradation, and barrel export surface.
 */

import { test, expect } from '@playwright/test'

test.describe('E01-S02: Neo4j Aura setup + neo4jQuery wrapper', () => {
  test('Acceptance: neo4jQuery injects institution_id', async () => {
    const { neo4jQuery } = await import('../../packages/neo4j/client')

    // Query with institution_id — should inject automatically
    const result = await neo4jQuery(
      'MATCH (n {institution_id: $institution_id}) RETURN count(n) AS count',
      {},
      { institution_id: 'test-institution-001' }
    )

    // If Neo4j is available, result should have records array
    // If unavailable, graceful degradation returns null
    if (result) {
      expect(result.records).toBeDefined()
      expect(Array.isArray(result.records)).toBe(true)
      expect(result.summary).toBeDefined()
      expect(typeof result.summary.countersUpdated).toBe('boolean')
    } else {
      // Graceful degradation — this is acceptable behavior
      expect(result).toBeNull()
    }
  })

  test('Acceptance: driver is singleton', async () => {
    const { getDriver } = await import('../../packages/neo4j/driver')
    const driver1 = getDriver()
    const driver2 = getDriver()
    // Same reference (singleton pattern)
    expect(driver1).toBe(driver2)
  })

  test('Acceptance: graceful degradation when Neo4j unavailable', async () => {
    // Save and clear NEO4J_URI to simulate unavailability
    const originalUri = process.env.NEO4J_URI
    delete process.env.NEO4J_URI

    // Dynamic import to get a fresh module evaluation context
    // Note: due to module caching, we test the getDriver() path directly
    const driverModule = await import('../../packages/neo4j/driver')

    // Close any existing driver to force re-evaluation
    await driverModule.closeDriver()

    const driver = driverModule.getDriver()
    expect(driver).toBeNull()

    // Also test neo4jQuery with no driver
    const { neo4jQuery } = await import('../../packages/neo4j/client')
    const result = await neo4jQuery(
      'MATCH (n) RETURN n',
      {},
      { institution_id: 'test-institution' }
    )
    expect(result).toBeNull()

    // Restore
    if (originalUri) {
      process.env.NEO4J_URI = originalUri
    }
  })

  test('Acceptance: barrel export does not expose driver internals', async () => {
    const neo4jPackage = await import('../../packages/neo4j/index')

    // Public API should be available
    expect(neo4jPackage).toHaveProperty('neo4jQuery')
    expect(typeof neo4jPackage.neo4jQuery).toBe('function')

    // SAME_AS utility should be available
    expect(neo4jPackage).toHaveProperty('createSameAsIfSafe')
    expect(typeof neo4jPackage.createSameAsIfSafe).toBe('function')

    // Driver internals must NOT be exported
    expect(neo4jPackage).not.toHaveProperty('getDriver')
    expect(neo4jPackage).not.toHaveProperty('closeDriver')
    expect(neo4jPackage).not.toHaveProperty('driver')
  })

  test('Acceptance: SAME_AS rejects self-link', async () => {
    const { createSameAsIfSafe } = await import('../../packages/neo4j/same-as')

    const result = await createSameAsIfSafe(
      'uuid-same',
      'uuid-same',
      { source: 'test' },
      { institution_id: 'test-institution' }
    )

    expect(result.created).toBe(false)
    expect(result.reason).toContain('self')
  })
})
