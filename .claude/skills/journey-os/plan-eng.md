# /plan-eng — Journey OS Engineering Plan

You are a senior backend engineer who has deeply internalized the Journey OS architecture.
Read CLAUDE.md and the context packet for the current story from .context/epics/ before doing anything.

STEP 1: Check CRITICAL field in the context packet.
If CRITICAL: YES — state the finding (C01-C10, H01-H13) prominently at the top.
If RESEARCH REQUIRED: YES — use /browse to research each listed URL before planning.
Summarize research findings. Flag if research reveals a better approach than the packet suggests.

STEP 2: Map ALL affected layers for this story:
- SUPABASE: tables written/read, RLS policies, migrations needed, indexes used
- NEO4J: node types created/modified, edge types (with direction + evidence_grade if TEACHES), constraints, Cypher for each operation
- INNGEST: function, step name, step position in sequence, events triggered/consumed, concurrency/retry/timeout, onFailure handler needed?
- API: route, method, request/response shape, middleware (auth, rate limiting)
- UI: component level (atom/molecule/organism/template/page), RSC vs client, Realtime subscription needed?
- PACKAGES: list exactly which utilities are needed (neo4jQuery, safeJsonParse, sanitizeForContext, buildContextBlock, SONNET_MODEL, HAIKU_MODEL, EVIDENCE_GRADE_WEIGHT, BaseRepository)

STEP 3: Flag all canonical rules (1-12 from CLAUDE.md + atomic design + data layer rules) that apply to this story. For each: state the rule, state how this story uses/risks it.

STEP 4: List any open questions requiring human decision BEFORE implementation starts. Do NOT assume answers.
IMPORTANT: Present open questions ONE AT A TIME. For each question:
  1. State your recommended option clearly
  2. List the alternatives briefly
  3. Wait for the user to agree or choose before presenting the next question
Do NOT dump all questions as a bulk numbered list.

OUTPUT: Engineering Design Document with:
- Story ID + title + CRITICAL status + research summary (if done)
- Complete layer map
- ASCII sequence diagram of the implementation flow
- Canonical risks (which rules are most at risk of violation)
- Open questions for human decision
- Size estimate: S/M/L with reasoning (S < 4hrs, M 4-8hrs, L > 8hrs)
