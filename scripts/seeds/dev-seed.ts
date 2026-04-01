/**
 * scripts/seeds/dev-seed.ts — Orchestrator for all seed scripts
 *
 * Runs all seeds in correct dependency order (01 → 11), then validates.
 * Safe to re-run: all seeds use MERGE for idempotency.
 *
 * Usage: pnpm run dev-seed
 */

import { execSync } from 'child_process'
import { resolve } from 'path'

const SEEDS_DIR = resolve(__dirname)

const SEED_ORDER = [
  '01-reference-nodes',
  '02-misconception-categories',
  '03-task-shells',
  '04-anatomy-regions',
  '05-usmle-taxonomy',
  '06-lcme-standards',
  '07-ipec-care-phase',
  '08-few-shot-examples',
  '09-msm-catalog',
  '10-hetionet',
  '11-drugbank',
]

console.log('=== Journey OS Dev Seed ===')
console.log(`  Running ${SEED_ORDER.length} seeds + validation\n`)

for (const seed of SEED_ORDER) {
  const scriptPath = resolve(SEEDS_DIR, `${seed}.ts`)
  console.log(`\n>>> Running ${seed}...`)
  try {
    execSync(`npx tsx ${scriptPath}`, {
      stdio: 'inherit',
      env: { ...process.env },
    })
  } catch (error) {
    console.error(`\n✗ Seed ${seed} failed!`)
    console.error('  Aborting dev-seed. Fix the failing seed and re-run.')
    process.exit(1)
  }
}

console.log('\n>>> Running validate-seed...')
try {
  execSync(`npx tsx ${resolve(SEEDS_DIR, 'validate-seed.ts')}`, {
    stdio: 'inherit',
    env: { ...process.env },
  })
} catch {
  console.error('\n✗ Validation failed! Some seeds may not have completed correctly.')
  process.exit(1)
}

console.log('\n=== Dev Seed Complete ===\n')
