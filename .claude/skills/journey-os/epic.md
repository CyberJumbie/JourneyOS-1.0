# /epic — Parallel Story Execution via Git Worktrees

Usage: /epic [epic-id]           e.g. /epic E03
       /epic [epic-id] PHASE[N]  e.g. /epic E03 PHASE3

STEP 1: Read EPIC.md
Load .context/epics/[epic-id]/EPIC.md
Parse the machine-readable dependency table:
  | Story | Title | Deps | Parallelizable | Size | Phase |

Group stories by Phase. Within each phase:
- Stories with PARALLELIZABLE: YES and same Phase = can run as git worktrees
- Verify no two parallel stories share files in their FILES OWNED sections
  If conflict found: STOP and report — "CONFLICT: [S-XX] and [S-XX] both own [filename]"
  These cannot be parallelized. Adjust EPIC.md Phase column and retry.

STEP 2: Display execution plan
Show all phases with timing estimates.
Parallel phases labeled: PARALLEL — N worktrees
Sequential phases labeled: sequential
Ask: "Which phase to run? (number, 'next' for next incomplete, or 'all' for sequential)"

STEP 3: For parallel phases — create git worktrees
For each story in the parallel phase:
  git worktree add ../journey-[STORY-ID] -b feat/JRNOS-[STORY-ID]-[short-desc]

Output exact commands to run in each worktree:
  "Open N Claude Code sessions:"
  "  cd ../journey-[STORY-ID] && claude"
  "  Then run: /plan-eng → /plan → [implement] → /validate → /qa → /ship"

Track status in .epic-status/[epic-id]-phase[N].json:
  { "phase": N, "stories": { "EXX-SXX": "in_progress", "EXX-SXX": "in_progress" } }

STEP 4: After all parallel stories shipped (PRs merged to develop)
For each worktree: git worktree remove ../journey-[STORY-ID]
git checkout develop && git pull
Update .epic-status: mark phase complete
Output: "Phase N complete. Run /epic [epic-id] PHASE[N+1] to continue."

IMPORTANT: Activate /careful before creating worktrees for phases that include seed files or migrations.
