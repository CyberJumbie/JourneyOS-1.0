# /plan — Journey OS Implementation Plan

Read the Engineering Design Document from /plan-eng.
Convert into numbered, atomic, verifiable implementation steps.

RULES for step decomposition:
- Each step: completable in < 30 minutes of focused work
- Each step: independently verifiable (has clear success criteria)
- Each step: doesn't break the build when complete
- Mark [CAREFUL] for: seed files, migrations, security/RLS changes, canonical decision files
- Mark [HUMAN REVIEW] for: architectural decisions needing judgment
- Mark [PARALLELIZABLE] for: steps that could run in separate worktrees

OUTPUT FORMAT:
---
## Plan: [Story ID] [Title]

### Pre-flight checks
- [ ] Seed scripts that must have run: [list from context packet]
- [ ] Required env vars set: [list from .env.example]
- [ ] Services running: Supabase local, Inngest dev (localhost:8288), sidecars, pnpm dev

### Steps
**Step 1**: [Action title] [S/M size indicator]
- File: [exact path]
- What: [specific action — create function X with behavior Y]
- Pattern: [which pattern from context packet's "code to follow" section]
- Canonical check: [which Rule N applies]
- Verify: [how to confirm step is complete — specific check]

[continue for all steps]

### Rollback procedure
If implementation fails after step N:
1. [Exact SQL to reverse migration if applied]
2. [Exact Cypher to remove any Neo4j nodes/edges created]
3. git stash && git checkout develop
---

After outputting the plan: "Approve this plan? Any changes before I start implementing?"
DO NOT start implementing until the user explicitly says to proceed.
