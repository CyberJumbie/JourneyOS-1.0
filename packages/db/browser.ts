/**
 * @journey/db/browser — Browser-side Supabase client.
 *
 * Uses the anon key — ALL queries go through RLS.
 * NEVER import server.ts or use the service_role key here (FERPA violation).
 */

import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'
import type { Database } from './types/database.generated'

// ---------------------------------------------------------------------------
// Singleton browser client
// ---------------------------------------------------------------------------

let browserClient: ReturnType<typeof createSSRBrowserClient<Database>> | null = null

/**
 * Create (or return cached) Supabase browser client.
 * Uses the anon key — RLS enforced on every query.
 *
 * Usage:
 *   const supabase = createBrowserClient()
 *   const { data } = await supabase.from('lectures').select('*')
 *
 * IMPORTANT: Clean up Realtime subscriptions in useEffect return function.
 */
export function createBrowserClient() {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Check .env.local against .env.example.'
    )
  }

  browserClient = createSSRBrowserClient<Database>(url, anonKey)
  return browserClient
}
