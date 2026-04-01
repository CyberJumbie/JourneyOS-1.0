/**
 * @journey/db/server — Server-side Supabase clients.
 *
 * TWO clients:
 *   createServerClient()  — cookie-based auth for RSC + API routes (respects RLS)
 *   createServiceClient() — service_role key (bypasses RLS, server-only admin ops)
 *
 * NEVER import this file from client components (FERPA violation).
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */

import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './types/database.generated'

// ---------------------------------------------------------------------------
// Environment validation — fail fast on missing config
// ---------------------------------------------------------------------------

function getEnvOrThrow(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `Missing environment variable: ${key}. Check .env.local against .env.example.`
    )
  }
  return value
}

// ---------------------------------------------------------------------------
// createServerClient — cookie-based auth for RSC + API routes
// ---------------------------------------------------------------------------

/**
 * Create a Supabase client that reads/writes auth cookies in Next.js RSC or
 * API route context. Respects RLS — the user sees only what their role allows.
 *
 * Usage:
 *   const supabase = await createServerClient()
 *   const { data } = await supabase.from('lectures').select('*')
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createSSRServerClient<Database>(
    getEnvOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    getEnvOrThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as never)
            })
          } catch {
            // setAll can throw in RSC (read-only). This is expected —
            // the middleware will handle token refresh for RSC.
          }
        },
      },
    }
  )
}

// ---------------------------------------------------------------------------
// createServiceClient — service_role key (bypasses RLS)
// ---------------------------------------------------------------------------

/**
 * Create a Supabase client with the service_role key. Bypasses all RLS.
 *
 * USE ONLY for:
 *   - Inngest pipeline steps (no user context)
 *   - Admin operations that span institutions
 *   - Seed scripts and migrations
 *
 * NEVER expose this to browser code. NEVER return data from this client
 * directly to an unauthenticated endpoint.
 */
export function createServiceClient() {
  return createClient<Database>(
    getEnvOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
