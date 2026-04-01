# Changelog

All notable changes to Journey OS will be documented in this file.

## [0.1.0.0] - 2026-04-01

### Added
- Supabase typed client layer with server (cookie-based SSR), service (admin), and browser (RLS-enforced) clients
- BaseRepository abstract class enforcing Supabase-first dual-write pattern (Rule 6 / G08) with institution_id tenant isolation
- Neo4j tenant-isolated query wrapper (neo4jQuery) that injects institution_id on every Cypher query (Rule 1 / C05)
- Neo4j singleton driver with globalThis HMR survival, configurable pool size, and 30s Aura wake-up timeouts
- SAME_AS edge creation utility with atomic cycle detection and canonical UUID direction
- ESLint AP-01 rule banning raw neo4j-driver imports outside the wrapper package
- Recursive Neo4j Integer-to-JS-number conversion preventing silent type corruption
- `import 'server-only'` guard on server.ts preventing accidental FERPA key exposure in browser bundles
- Playwright acceptance tests for both packages (table existence, RLS, singleton driver, graceful degradation, barrel exports)
