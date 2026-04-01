#!/usr/bin/env bash
# Journey OS skill setup — wires gstack + Journey OS skills
set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}Journey OS — Development Environment Setup${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check prerequisites
check() {
  if command -v "$1" &>/dev/null; then
    echo -e "  ${GREEN}✓${RESET} $1 found"
  else
    echo -e "  ${RED}✗${RESET} $1 not found — install it first"
    MISSING=1
  fi
}

echo ""
echo "Checking prerequisites..."
MISSING=0
check node
check bun
check git
check pnpm
check docker

if [ "$MISSING" = "1" ]; then
  echo ""
  echo -e "${RED}Install missing prerequisites then re-run this script.${RESET}"
  exit 1
fi

# Install gstack globally
echo ""
echo "Installing gstack..."
if [ -d "$HOME/.claude/skills/gstack" ]; then
  echo -e "  ${GREEN}✓${RESET} gstack already installed — upgrading"
  cd "$HOME/.claude/skills/gstack" && git pull && ./setup && cd - > /dev/null
else
  git clone https://github.com/garrytan/gstack.git "$HOME/.claude/skills/gstack"
  cd "$HOME/.claude/skills/gstack" && ./setup && cd - > /dev/null
  echo -e "  ${GREEN}✓${RESET} gstack installed"
fi

# Register Journey OS custom skills with Claude Code
echo ""
echo "Registering Journey OS custom skills..."
SKILLS_DIR="$(pwd)/.claude/skills/journey-os"
if [ -d "$SKILLS_DIR" ]; then
  echo -e "  ${GREEN}✓${RESET} Skills found at $SKILLS_DIR"
  echo -e "  ${GREEN}✓${RESET} Claude Code auto-discovers skills in .claude/skills/"
else
  echo -e "  ${RED}✗${RESET} Skills not found — run from repo root"
  exit 1
fi

# Install node modules
echo ""
echo "Installing dependencies..."
pnpm install
echo -e "  ${GREEN}✓${RESET} pnpm install complete"

# Summary
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}Setup complete!${RESET}"
echo ""
echo "Next steps:"
echo ""
echo -e "  1. ${BOLD}Copy .env.example → .env.local and fill in credentials:${RESET}"
echo "     cp .env.example .env.local"
echo ""
echo -e "  2. ${BOLD}Open Claude Code in this directory:${RESET}"
echo "     claude ."
echo ""
echo -e "  3. ${BOLD}Run bootstrap prompt (Prompt 1) to scaffold the repo${RESET}"
echo -e "     ${YELLOW}See: tests/fixtures/journey-os-development-system.html → §II Day 1 Setup${RESET}"
echo ""
echo -e "  4. ${BOLD}Run context packet generation (Prompt 2) to create all stories${RESET}"
echo ""
echo "Available custom commands in Claude Code:"
echo "  /plan-eng  /plan  /validate  /qa  /ship  /epic"
echo ""
