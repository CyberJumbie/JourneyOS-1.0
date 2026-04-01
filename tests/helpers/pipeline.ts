import type { APIRequestContext } from '@playwright/test'

/**
 * Poll entity status until it reaches targetStatus.
 * Used for pipeline stories to wait for Inngest step completion.
 */
export async function waitForStatus(
  request: APIRequestContext,
  entityId: string,
  targetStatus: string,
  options: { timeoutMs?: number; pollMs?: number; route?: string } = {}
): Promise<void> {
  const { timeoutMs = 300_000, pollMs = 3000, route = 'lectures' } = options
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const res = await request.get(`/app/api/${route}/${entityId}/status`)
    const { status } = await res.json()
    if (status === targetStatus) return
    if (status === 'failed') throw new Error(`Pipeline failed for ${entityId} — check Inngest dev at localhost:8288`)
    await new Promise(r => setTimeout(r, pollMs))
  }
  throw new Error(`Timeout after ${timeoutMs}ms waiting for status '${targetStatus}' on ${entityId}`)
}

/** 
 * Get test auth token for a specific role.
 * Uses the test-only /app/api/test/auth endpoint.
 */
export async function getTestToken(
  request: APIRequestContext,
  role: 'faculty' | 'admin' | 'student',
  opts?: { institution_id?: string; course_id?: string }
): Promise<string> {
  const res = await request.post('/app/api/test/auth', {
    data: {
      role,
      institution_id: opts?.institution_id || 'DEV-INSTITUTION-00000000',
      course_id: opts?.course_id,
    }
  })
  if (!res.ok()) throw new Error(`getTestToken failed: ${res.status()} ${await res.text()}`)
  const { token } = await res.json()
  return token
}
