# packages/ai — Claude API client, prompts, utilities

MODEL ROUTING (canonical D05):
  SONNET_MODEL → import from ./constants  (core generation + critique)
  HAIKU_MODEL  → import from ./constants  (HyDE, distractors, rationale, QA, LOD, classify)
  Cost target: $0.12/item. Never use Sonnet where Haiku suffices.
  NEVER hardcode model strings outside constants.ts.

ALWAYS use safeJsonParse for ALL Claude responses:
  import { safeJsonParse } from './safe-parse'
  const { data, repaired } = safeJsonParse<T>(response.content[0].text)
  If !data: handle gracefully (log + skip), never throw

ALWAYS sanitize lecture content before LLM prompts:
  import { sanitizeForContext, buildContextBlock } from './sanitize'
  const context = buildContextBlock({ chunks, lod, structured, global? })
  // Wraps in XML delimiters, removes injection patterns

ALWAYS load prompts from files (never inline):
  import { loadPrompt } from './prompt-loader'
  const sys = await loadPrompt('nbme-system')
  // Files: ./prompts/nbme-system.md, critique-gate.md, distractor.md,
  //        lcme-classifier.md, lod-brief.md, why-wrong.md, ocr.md

ALWAYS Promise.allSettled for batch Claude calls:
  Promise.allSettled(items.map(fn))   ← one failure must not kill the batch
  NOT Promise.all()                   ← banned in any multi-item pipeline step
