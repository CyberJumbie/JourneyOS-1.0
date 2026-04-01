# apps/inngest — Inngest pipeline functions (P1, P2, P3)

## Function naming
journey/lecture.process      → P1 ingestion pipeline
journey/subconcept.enrich    → P2 enrichment pipeline
journey/items.batch-generate → P3 generation pipeline
journey/mastery.update       → BKT update (priority: high, timeout: 30s)

## Step patterns
step.run('step-name', async () => { ... })           → retryable step
step.waitForEvent('event', { timeout: '7d' })        → human approval gate
step.sleep('wait', '1s')                             → rate limiting
step.sendEvent('next', { name: 'journey/...', data }) → fan-out

## Error handling
onFailure({ event, error }) → write to pipeline_dead_letters, alert admin
Per-step failure: catch + log + continue (don't let one slide fail the pipeline)
Pipeline failure: escalate to dead letter only after all retries exhausted

## Concurrency limits (all enforced at function level)
P1 (lecture.process): 10 concurrent, 5 min timeout per step
P2 (subconcept.enrich): 20 concurrent, UMLS 20 req/sec throttle
P3 (items.batch-generate): 3 concurrent per facultyId, daily quota check first

## NEVER in pipeline code
Never call supabase from client components — server-only here
Never use Promise.all — always Promise.allSettled (AP-03)
Never use raw JSON.parse — always safeJsonParse (AP-02)
Never write Neo4j before Supabase (AP-06)
