# Journey OS — Canonical Antipatterns
# All 17 patterns that /review treats as BUGS (not style issues)
# Updated: whenever a new violation is caught in PR review

## AP-01 — Raw neo4j-driver import (CRITICAL)
Failure: Any query without institution_id returns data from ALL institutions. Silent FERPA breach.
```typescript
// ✗ BANNED — ESLint error, PR blocked
import { driver } from 'neo4j-driver'
import { driver } from './driver'
await driver.executeQuery(`MATCH (sc:SubConcept) RETURN sc`) // returns ALL institutions

// ✓ CORRECT
import { neo4jQuery } from '@journey/neo4j/client'
const result = await neo4jQuery(`MATCH (sc:SubConcept {institution_id: $institution_id}) RETURN sc`, {}, ctx)
```

## AP-02 — JSON.parse on Claude response (CRITICAL)
Failure: Claude returns malformed JSON ~1-3% of the time. Raw parse throws, crashing entire P3 batch.
```typescript
// ✗ BANNED
const item = JSON.parse(response.content[0].text)

// ✓ CORRECT
import { safeJsonParse } from '@journey/ai/safe-parse'
const { data, repaired } = safeJsonParse<ItemCore>(response.content[0].text)
if (!data) { logger.warn('Parse failed', { raw: response.content[0].text.slice(0,200) }); continue }
```

## AP-03 — Promise.all in batch Claude calls (CRITICAL)
Failure: One bad response or rate limit error kills entire batch. Faculty sees 0 items from 30 attempts.
```typescript
// ✗ BANNED
const items = await Promise.all(targets.map(t => generateItem(t)))

// ✓ CORRECT
const results = await Promise.allSettled(targets.map(t => generateItem(t)))
const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value)
```

## AP-04 — Hardcoded model string (HIGH)
Failure: Model retirement creates cryptic API errors scattered across 20+ call sites.
```typescript
// ✗ BANNED (anywhere except packages/ai/constants.ts)
model: 'claude-sonnet-4-20250514'

// ✓ CORRECT
import { SONNET_MODEL, HAIKU_MODEL } from '@journey/ai/constants'
model: SONNET_MODEL
```

## AP-05 — Unsanitized content in LLM prompt (CRITICAL)
Failure: Adversarial faculty slide "Ignore previous instructions" corrupts item generation.
```typescript
// ✗ BANNED
const prompt = `Here is the lecture content: ${chunkText}`

// ✓ CORRECT
import { sanitizeForContext, buildContextBlock } from '@journey/ai/sanitize'
const context = buildContextBlock({ chunks, lod, structured })
// Produces: <lecture_content>[sanitized]</lecture_content>
```

## AP-06 — Neo4j written before Supabase (HIGH)
Failure: Neo4j write succeeds + Supabase fails = orphaned graph node. Reconciliation can't sync back (no Supabase row).
```typescript
// ✗ BANNED
await neo4jQuery(`MERGE (sc:SubConcept...)`)
await supabase.from('subconcepts').insert({...}) // if fails: orphaned Neo4j node

// ✓ CORRECT — Supabase first, always
const { data } = await supabase.from('subconcepts').insert({...}).select().single()
await neo4jQuery(`MERGE (sc:SubConcept {uuid: $uuid})...`, { uuid: data.uuid }, ctx)
```

## AP-07 — lod_brief as Neo4j property (HIGH)
Failure: LOD briefs expire every 180 days and need quarterly regeneration. Impossible in Neo4j. Also hits 64KB string limit at scale.
```typescript
// ✗ BANNED
await neo4jQuery(`MATCH (sc:SubConcept {uuid:$uuid}) SET sc.lod_brief = $brief`, { brief: lodText }, ctx)

// ✓ CORRECT — store in Supabase, SubConcept carries only FK
await supabase.from('subconcept_lod_briefs').upsert({ subconcept_uuid: uuid, lod_brief: lodText })
// SubConcept.lod_brief_id UUID FK only (8 bytes in Neo4j)
```

## AP-08 — Wrong SLO→ILO direction (HIGH)
Failure: LCME compliance query traverses SLO → ILO. Reversed edges return zero results. Readiness Room shows 0% coverage.
```cypher
// ✗ BANNED
MATCH (ilo:ILO)-[:CONTRIBUTES_TO]->(slo:SLO)

// ✓ CORRECT — SLO is the child, ILO is the parent
MERGE (slo:SLO {uuid:$uuid})-[:CONTRIBUTES_TO]->(ilo:ILO {uuid:$iloUuid})
// Audit: MATCH (ilo:ILO)-[:CONTRIBUTES_TO]->(slo:SLO) RETURN count(*) → should always be 0
```

## AP-09 — TEACHES edge missing evidence_grade (HIGH)
Failure: Path confidence = product of edge weights. Missing weight → NaN. Coverage heatmap shows wrong values. StudyQueue broken.
```cypher
// ✗ BANNED
MERGE (cc:ContentChunk {uuid:$id})-[:TEACHES]->(sc:SubConcept {uuid:$sc})

// ✓ CORRECT — always include both properties
MERGE (cc:ContentChunk {uuid:$id})-[t:TEACHES]->(sc:SubConcept {uuid:$sc})
  ON CREATE SET t.evidence_grade = 'C', t.evidence_weight = 0.65,
               t.established_at = datetime(), t.rrf_score = $score
```

## AP-10 — CoverageRecord read-modify-write (CRITICAL)
Failure: 10 concurrent approvals, all read count=0, all write count=1. Coverage shows 1 instead of 10. Items vanish from coverage tracking.
```typescript
// ✗ BANNED — race condition
const [cr] = await neo4jQuery(`MATCH (cr:CoverageRecord) RETURN cr.assessment_count`, {}, ctx)
await neo4jQuery(`MATCH (cr:CoverageRecord) SET cr.assessment_count = $n`, { n: cr + 1 }, ctx)

// ✓ CORRECT — atomic SET expression
await neo4jQuery(`
  MATCH (sc:SubConcept {uuid:$uuid})-[:HAS_COVERAGE]->(cr:CoverageRecord)
  SET cr.assessment_count = cr.assessment_count + 1,
      cr.coverage_score = toFloat(min(cr.assessment_count + 1, 3)) / 3.0
`, { uuid: scUuid }, ctx)
```

## AP-11 — Speaker notes embedded in ContentChunks (HIGH)
Failure: Student-facing retrieval returns faculty pedagogical intent. FERPA: faculty may note student struggles.
```typescript
// ✗ BANNED
const chunkText = section.body_text + section.speaker_notes

// ✓ CORRECT — body_text only for chunks; speaker notes → SpeakerNote node
const chunkText = section.body_text
```

## AP-12 — Inline LLM prompts (HIGH)
Failure: One-word change in inline prompt silently changes item format across all future generations. No diff visible, no regression test.
```typescript
// ✗ BANNED
system: `You are an expert NBME item writer...`

// ✓ CORRECT — versioned in packages/ai/prompts/
import { loadPrompt } from '@journey/ai/prompt-loader'
system: await loadPrompt('nbme-system') // packages/ai/prompts/nbme-system.md
```

## AP-13 — Chunk size outside 150-250 tokens (HIGH)
Failure: Too small → entity boundary split, NER misses concepts, embedding degrades.
Too large → BM25 precision drops, generation context unfocused.
```typescript
// ✗ BANNED
const chunks = splitText(text, { maxTokens: 512 })
const chunks = splitText(text, { maxTokens: 100 })

// ✓ CORRECT — use canonical chunkSection from packages/ai/chunker.ts
const chunks = chunkSection(text, { target: 200, max: 260, overlap: true })
```

## AP-14 — SAME_AS edges without cycle check (CRITICAL)
Failure: Cycle A→B→A causes infinite traversal. Coverage heatmap query hangs. Neo4j connection pool exhausted.
```cypher
// ✗ BANNED
MERGE (a)-[:SAME_AS]->(b)

// ✓ CORRECT — use createSameAsIfSafe() from packages/neo4j/same-as.ts
await createSameAsIfSafe(aUuid, bUuid, confidence, ctx)
```

## AP-15 — Student item access outside active session (CRITICAL)
Failure: Students pre-fetch exam answers before session starts. Enrollment-only RLS is insufficient.
```sql
-- ✗ BANNED — enrollment only
CREATE POLICY student_items ON assessment_items USING (student_enrolled_in_course)

-- ✓ CORRECT — time-windowed to active session (C02 fix)
CREATE POLICY student_active_exam ON assessment_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM session_items si JOIN sessions s ON s.id = si.session_id
            WHERE si.item_id = assessment_items.id AND s.student_id = auth.uid()
            AND s.completed_at IS NULL))
```

## AP-16 — Hand-written interface duplicating database schema (HIGH)
Failure: Schema rename (e.g. qa_score → qa_score_value) silently breaks hand-written interfaces. TypeScript doesn't catch it.
```typescript
// ✗ BANNED
interface AssessmentItem { uuid: string; qaScore: number }  // drifts silently from schema

// ✓ CORRECT — import from generated types
import type { AssessmentItemRow } from '@journey/db/client'
// type AssessmentItemRow = Database['public']['Tables']['assessment_items']['Row']
// After every migration: pnpm db:types to regenerate
```

## AP-17 — Sequential .insert() for multi-table atomic operations (CRITICAL)
Failure: sessions INSERT succeeds + session_items INSERT fails = student has session with no exam items. Blank exam. Unrecoverable without DB intervention.
```typescript
// ✗ BANNED — sequential inserts are NOT atomic
await supabase.from('sessions').insert(session)
await supabase.from('session_items').insert(items)  // if this fails: orphaned session

// ✓ CORRECT — Postgres transaction via RPC
await supabase.rpc('create_exam_session', { p_session_id, p_exam_id, p_student_id, ... })
```
