# packages/embeddings — MedCPT + text-embedding-3-small

ROUTING RULE (canonical):
  entity_density > 0.3  →  MedCPT (768-dim)           biomedical content
  entity_density ≤ 0.3  →  text-embedding-3-small (1536-dim)  general text

  import { embedChunk } from './router'
  const embedding = await embedChunk(text, entityDensity)

MEDCPT:
  Self-hosted sidecar at MEDCPT_API_URL (Railway/Fly.io)
  768-dim vectors stored in embedding_med column (HNSW index: m=16, ef_construction=64)
  Cold start risk: keep-warm cron every 10 minutes during business hours (7am-10pm ET)

TEXT-EMBEDDING-3-SMALL:
  OpenAI API (OPENAI_API_KEY env var)
  1536-dim vectors stored in embedding_gen column (HNSW index: m=16, ef_construction=64)

THREE GRANULARITY LEVELS (always generate all three per upload):
  Chunk level   → stored in content_chunks.embedding_med / embedding_gen
  Section level → stored in lecture_sections.embedding_med / embedding_gen
  Lecture level → stored in lectures.embedding_summary (summary embedding)

Never call OpenAI or MedCPT APIs directly — always use embedChunk() for routing.
