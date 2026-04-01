/**
 * @journey/db/BaseRepository — Abstract dual-write base class.
 *
 * Enforces Rule 6 (G08): Supabase FIRST, Neo4j SECOND, Neo4j failure NEVER blocks.
 * Uses dependency injection for the optional Neo4j sync callback.
 * Provides defense-in-depth tenant isolation via institutionId on all queries.
 *
 * Every repository that writes data with a KG counterpart MUST extend this.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types/database.generated'
import type { TableName } from './client'

const DEFAULT_QUERY_LIMIT = 1000

/** Result of a Neo4j sync attempt. */
export type Neo4jSyncResult = {
  success: boolean
  error?: string
}

/**
 * Callback injected by the consuming feature to sync a record to Neo4j.
 * Receives the Supabase row ID and the full row data.
 * Returns a Neo4jSyncResult indicating success or failure.
 *
 * Default: no-op that returns { success: false } and marks status 'pending'.
 */
export type Neo4jSyncCallback<TRow> = (
  id: string,
  row: TRow
) => Promise<Neo4jSyncResult>

/** Options for creating a BaseRepository instance. */
export interface BaseRepositoryOptions<TRow> {
  /** Supabase client (server or service). */
  supabase: SupabaseClient<Database>
  /** The table this repository operates on. */
  table: TableName
  /** Institution ID for tenant isolation (defense-in-depth on top of RLS). */
  institutionId: string
  /** Optional Neo4j sync callback. If not provided, sync is deferred (status stays 'pending'). */
  neo4jSync?: Neo4jSyncCallback<TRow>
}

// ---------------------------------------------------------------------------
// BaseRepository
// ---------------------------------------------------------------------------

/**
 * Abstract base class enforcing the dual-write pattern.
 *
 * Subclasses implement domain-specific queries. The base class handles:
 *   1. Tenant isolation via institution_id filter (defense-in-depth over RLS)
 *   2. Supabase write (FIRST — always)
 *   3. Neo4j sync attempt (SECOND — never blocks on failure)
 *   4. neo4j_sync_status / neo4j_synced_at column updates
 *
 * The Neo4j sync callback is injected via constructor. If not provided,
 * records are created with neo4j_sync_status = 'pending' and the weekly
 * reconciliation Inngest job will catch them.
 */
export abstract class BaseRepository<
  T extends TableName,
  TRow = Database['public']['Tables'][T]['Row'],
  TInsert = Database['public']['Tables'][T]['Insert'],
  TUpdate = Database['public']['Tables'][T]['Update'],
> {
  protected readonly supabase: SupabaseClient<Database>
  protected readonly table: T
  protected readonly institutionId: string
  private readonly neo4jSync: Neo4jSyncCallback<TRow>

  constructor(options: BaseRepositoryOptions<TRow> & { table: T }) {
    this.supabase = options.supabase
    this.table = options.table
    this.institutionId = options.institutionId
    // Default: no-op sync that leaves status as 'pending'
    this.neo4jSync = options.neo4jSync ?? (async () => ({ success: false }))
  }

  // -------------------------------------------------------------------------
  // CRUD with dual-write + tenant isolation
  // -------------------------------------------------------------------------

  /**
   * Insert a record into Supabase, then attempt Neo4j sync.
   * Neo4j failure never blocks — status is set to 'pending' or 'failed'.
   */
  async insert(data: TInsert): Promise<{ data: TRow | null; error: Error | null }> {
    // Step 1: Supabase FIRST (G08)
    const { data: row, error } = await this.supabase
      .from(this.table)
      .insert(data as never)
      .select()
      .single()

    if (error || !row) {
      return { data: null, error: error ? new Error(error.message) : new Error('Insert returned no data') }
    }

    const typedRow = row as unknown as TRow

    // Step 2: Neo4j SECOND (never blocks)
    await this.attemptNeo4jSync(typedRow)

    return { data: typedRow, error: null }
  }

  /**
   * Update a record in Supabase by ID, then attempt Neo4j sync.
   * Neo4j failure never blocks.
   */
  async update(
    id: string,
    data: TUpdate
  ): Promise<{ data: TRow | null; error: Error | null }> {
    // Step 1: Supabase FIRST (G08)
    const { data: row, error } = await this.supabase
      .from(this.table)
      .update(data as never)
      .eq('id' as never, id)
      .eq('institution_id' as never, this.institutionId)
      .select()
      .single()

    if (error || !row) {
      return { data: null, error: error ? new Error(error.message) : new Error('Update returned no data') }
    }

    const typedRow = row as unknown as TRow

    // Step 2: Neo4j SECOND (never blocks)
    await this.attemptNeo4jSync(typedRow)

    return { data: typedRow, error: null }
  }

  /**
   * Find a single record by ID, scoped to institution.
   */
  async findById(id: string): Promise<{ data: TRow | null; error: Error | null }> {
    const { data: row, error } = await this.supabase
      .from(this.table)
      .select()
      .eq('id' as never, id)
      .eq('institution_id' as never, this.institutionId)
      .single()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    return { data: row as unknown as TRow, error: null }
  }

  /**
   * Find all records matching a filter, scoped to institution.
   */
  async findMany(
    filters: Partial<Record<string, unknown>> = {},
    options: { limit?: number; orderBy?: string; ascending?: boolean } = {}
  ): Promise<{ data: TRow[]; error: Error | null }> {
    let query = this.supabase
      .from(this.table)
      .select()
      .eq('institution_id' as never, this.institutionId)

    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key as never, value as never)
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true })
    }

    query = query.limit(options.limit ?? DEFAULT_QUERY_LIMIT)

    const { data: rows, error } = await query

    if (error) {
      return { data: [], error: new Error(error.message) }
    }

    return { data: (rows ?? []) as unknown as TRow[], error: null }
  }

  // -------------------------------------------------------------------------
  // Neo4j sync (private — never call directly)
  // -------------------------------------------------------------------------

  /**
   * Attempt Neo4j sync. On failure, update neo4j_sync_status to 'failed'.
   * On success, update neo4j_sync_status to 'synced' and set neo4j_synced_at.
   *
   * NEVER throws — Neo4j failure must not block the caller.
   */
  private async attemptNeo4jSync(row: TRow): Promise<void> {
    const record = row as Record<string, unknown>
    const id = record['id'] as string | undefined

    if (!id) return

    try {
      const result = await this.neo4jSync(id, row)

      if (result.success) {
        await this.supabase
          .from(this.table)
          .update({
            neo4j_sync_status: 'synced',
            neo4j_synced_at: new Date().toISOString(),
          } as never)
          .eq('id' as never, id)
          .then(({ error }) => {
            if (error) console.error(`[BaseRepository] Failed to update sync status to 'synced' for ${this.table}/${id}:`, error)
          })
      }
      // If sync returned { success: false } without throwing, status stays 'pending'
    } catch (err) {
      // Neo4j failure NEVER blocks the user (G08)
      console.error(`[BaseRepository] Neo4j sync failed for ${this.table}/${id}:`, err)

      await this.supabase
        .from(this.table)
        .update({
          neo4j_sync_status: 'failed',
        } as never)
        .eq('id' as never, id)
        .then(({ error }) => {
          if (error) console.error(`[BaseRepository] Failed to update sync status to 'failed' for ${this.table}/${id}:`, error)
        })
    }
  }
}
