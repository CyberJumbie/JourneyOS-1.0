# Journey OS — CLAUDE.md
# Read this before writing any code. These are non-negotiable architectural invariants.
# Every gstack skill, every custom Journey OS command, every Claude Code session inherits this.

## Project
Journey OS: AI-first medical education OS for Morehouse School of Medicine (MSM).
LCME-accredited. FERPA-sensitive. Real exams. Real student grades.

Stack: Next.js 15 App Router · TypeScript 5 strict · Supabase (Postgres 16 + pgvector + RLS + Auth)
       Neo4j Aura Professional (GDS + APOC) · Inngest · Anthropic Sonnet 4 + Haiku 4.5
       MedCPT (768-dim biomedical embeddings) · text-embedding-3-small (1536-dim) · Tailwind + Radix UI

## gstack + Journey OS Custom Skills
Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.

gstack skills: /office-hours /plan-ceo-review /plan-eng-review /plan-design-review
/design-consultation /design-shotgun /design-html /review /ship /land-and-deploy /canary
/benchmark /browse /connect-chrome /qa /qa-only /design-review /setup-browser-cookies
/setup-deploy /retro /investigate /document-release /codex /cso /autoplan /careful
/freeze /guard /unfreeze /gstack-upgrade /learn

Journey OS custom skills (use these for story work):
/plan-eng → /plan → [implement] → /validate → /qa → /ship
/epic [id]  for parallel story execution via git worktrees

If skills aren't working: cd .claude/skills/journey-os && cat plan-eng.md

## Source of Truth Documents
All architecture decisions are documented in tests/fixtures/*.html
Read these before making any architectural decisions:
- journey-os-production-bible.html       — KG schema, pipelines, ECD, seed catalogue
- journey-os-tech-architecture.html      — SQL DDL, API routes, Inngest patterns, code
- journey-os-development-system.html     — workflow, CLAUDE.md, skills, antipatterns
- journey-os-architecture-best-practices.html — MVC, OOP, atomic design, data layer
- journey-os-team-kickoff.html           — features, moats, data sources, sprint plan

## THE THREE-HUB INVARIANT (D06 — CANONICAL)
THREE hubs. NEVER "dual-hub":
  SubConcept (knowledge hub) + SLO (pedagogical hub) + USMLE_Subtopic (assessment hub)
Every AssessmentItem MUST connect all three before entering the practice pool.
Items missing any hub edge are flagged `incomplete` and blocked from student queues.

## RULE 1 — Neo4j tenant isolation (C05) — THE MOST IMPORTANT RULE
ALWAYS:  import { neo4jQuery } from '@journey/neo4j/client'
BANNED:  import { driver } from './driver'          ← ESLint error, PR blocked
BANNED:  import { driver } from 'neo4j-driver'      ← ESLint error, PR blocked
The wrapper injects institution_id automatically and handles graceful degradation.

## RULE 2 — JSON parsing (H06)
ALWAYS:  const { data } = safeJsonParse<T>(claudeResponse)  [packages/ai/safe-parse.ts]
BANNED:  JSON.parse(claudeResponse)  ← crashes P3 batch on ~1-3% of Claude responses

## RULE 3 — Promise.allSettled for batches
ALWAYS:  Promise.allSettled(items.map(fn))
BANNED:  Promise.all(items.map(fn))  ← in any pipeline step with multiple Claude calls

## RULE 4 — Model constants (D05)
ALWAYS:  SONNET_MODEL, HAIKU_MODEL from packages/ai/constants.ts
BANNED:  'claude-sonnet-4-20250514' hardcoded anywhere except constants.ts
Cost target: $0.12/item. Sonnet for core generation + critique. Haiku for everything else.

## RULE 5 — Content sanitization (H12)
ALWAYS:  sanitizeForContext(text) + buildContextBlock(...) from packages/ai/sanitize.ts
         Wrap ALL lecture content in <lecture_content>...</lecture_content> XML delimiters
BANNED:  Raw chunk text concatenated directly into prompt strings (prompt injection vector)

## RULE 6 — Supabase-first dual-write (G08)
ALWAYS: Write Supabase FIRST. Neo4j SECOND. Neo4j failure NEVER blocks the user.
        Every table with a KG counterpart carries neo4j_synced_at + neo4j_sync_status.
        Weekly reconciliation Inngest job re-syncs failures.

## RULE 7 — LOD briefs in Supabase, not Neo4j (G05)
SubConcept Neo4j node: carries ONLY lod_brief_id UUID FK (8 bytes)
LOD brief text: lives in subconcept_lod_briefs Supabase table
BANNED: sc.lod_brief = '...' as Neo4j node property

## RULE 8 — SLO direction (D09)
CORRECT:  SLO -[:CONTRIBUTES_TO]→ ILO  (child flows to parent)
BANNED:   ILO -[:CONTRIBUTES_TO]→ SLO  (never)

## RULE 9 — Evidence grades on every TEACHES edge
Every TEACHES edge MUST carry:
  evidence_grade: 'A' | 'B' | 'C' | 'D'
  evidence_weight: 1.00 | 0.82 | 0.65 | 0.45
Cold-start = C (0.65). Post-P2 UMLS = B (0.82). Post-faculty-review = A (1.00).
Import EVIDENCE_GRADE_WEIGHT from packages/types/constants.ts

## RULE 10 — GROUNDED_IN scope (D03)
CORRECT: SubConcept → GROUNDED_IN → StandardTerm (LOD verification ONLY)
BANNED:  AssessmentItem → GROUNDED_IN (use SOURCED_FROM)
BANNED:  Lecture → GROUNDED_IN (use TEACHES chain)

## RULE 11 — CoverageRecord atomic updates (C03)
CORRECT:  SET cr.assessment_count = cr.assessment_count + 1  (atomic Cypher expression)
BANNED:   read count → increment → write back  (race condition on concurrent approvals)

## RULE 12 — Chunk size (D04)
CANONICAL: 150-250 tokens, 30-token overlap, entity-boundary-aligned.
BANNED: Arbitrary splits, zero overlap, >260 or <140 token chunks.

## Atomic Design — Dependency Rule
DEPENDENCIES FLOW DOWN ONLY — never sideways, never up:
  Atoms (shared/components/ui/atoms/)        → zero domain imports, pure Tailwind/Radix
  Molecules (shared/components/ui/molecules/) → atoms + domain value types ONLY (no hooks)
  Organisms (features/*/components/)          → molecules + atoms + hooks (feature-aware)
  Templates (shared/components/layouts/)      → structural shells, named content slots only
  Pages (app/)                                → templates + container organisms (< 30 lines)

NEVER: cross-feature internal imports (use feature's index.ts public API)
NEVER: service/repository calls in atoms or molecules
NEVER: business logic in templates or pages

## Data Layer Rules
ALWAYS: import Row<'table'> from @journey/db/client (generated types — never hand-write)
ALWAYS: createServerClient() in API routes + RSC (service_role key)
ALWAYS: createBrowserClient() in client components (anon key — RLS enforced)
ALWAYS: supabase.rpc() for multi-table atomic operations (not sequential .insert())
ALWAYS: BaseRepository<T> for all repositories (dual-write pattern enforced)
ALWAYS: RLS as the security floor (app-level filters are extra, never sufficient)
ALWAYS: clean up Realtime subscriptions in useEffect return function

BANNED: service_role key in browser code (FERPA violation)
BANNED: hand-written interfaces duplicating database schema (schema drift)
BANNED: sequential .insert() for operations that must be atomic
BANNED: Neo4j write before Supabase (G08)

After every migration: pnpm db:types (regenerates packages/db/types/database.generated.ts)
CI check: pnpm db:types:check (fails if committed types differ from schema)

## Code Review: Canonical Violations (flagged by /review as BUGS)
See: .context/canonical/antipatterns.md for all 17 antipatterns with code examples.
These are BUGS, not style issues. PR is blocked until resolved:
- neo4j-driver import (Rule 1)          - JSON.parse without safeJsonParse (Rule 2)
- Promise.all in batch Claude calls (Rule 3)  - Hardcoded model string (Rule 4)
- Unsanitized content in LLM prompt (Rule 5)  - Neo4j write before Supabase (Rule 6)
- lod_brief as Neo4j property (Rule 7)   - Wrong SLO→ILO direction (Rule 8)
- TEACHES edge missing evidence_grade (Rule 9) - GROUNDED_IN on non-LOD (Rule 10)
- CoverageRecord read-modify-write (Rule 11)   - Chunk size outside 150-250 tokens (Rule 12)
- Cross-feature internal imports (Atomic Rule) - Hand-written DB interface (Data Layer)
- Sequential .insert() for atomic ops (Data Layer) - service_role in browser (Data Layer)
- Domain logic in template/page (Atomic Rule)

## Seed Scripts — activate /careful before running any seed
Execution order (MUST follow — dependencies flow downward):
01-reference-nodes → 02-misconception-categories → 03-task-shells →
04-anatomy-regions → 05-usmle-taxonomy → 06-lcme-standards →
07-ipec-care-phase → 08-few-shot-examples → 09-msm-catalog →
10-hetionet → 11-drugbank → validate-seed

After ANY seed change: pnpm run validate-seed (ALL checks must be ✓)
BEFORE running seeds: activate /careful mode

## Feature-Slice Directory Structure
features/[feature]/       ← vertical slice per feature
  components/             ← organisms (presenters + containers)
  hooks/                  ← controllers (orchestrate UI state)
  services/               ← use cases (business logic)
  repositories/           ← data access (Supabase + Neo4j)
  types.ts                ← feature-local types only
  index.ts                ← public API (what the rest of the app sees)
shared/                   ← code used by 3+ features only
domain/                   ← framework-independent domain model
  entities/               ← AssessmentItem, SubConcept, ExamSession
  value-objects/          ← EvidenceGrade, QAScore, BloomLevel (immutable, validated)
  errors/                 ← DomainError + typed subclasses

## Context Packets
Every story has a context packet in .context/epics/[epic]/[story].md
Before any story: read the context packet (especially the TABLE OF CONTENTS section)
/plan-eng reads CLAUDE.md + context packet to generate a plan
Context packets include: TOC with epic map + dependencies + parallel companions

## Story Size Definitions
S = Small  (< 4 hours): single function/component, clear precedent
M = Medium (4-8 hours): multiple layers, one Inngest step
L = Large  (> 8 hours): cross-layer feature, new node type, complex algorithm

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
