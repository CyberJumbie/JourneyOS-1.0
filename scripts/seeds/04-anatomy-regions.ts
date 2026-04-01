/**
 * scripts/seeds/04-anatomy-regions.ts
 *
 * Seeds anatomy region hierarchy into Neo4j.
 * 8 top-level regions with medically accurate sub-regions.
 * Simplified hierarchy for E01-S06 — full AnatomicalSystem/Organ/Structure
 * taxonomy comes in E01-S08 with HetioNet.
 *
 * Node type:
 *   AnatomyRegion — uuid, name, code, parent_code (null for top-level), institution_id
 *   Edge: AnatomyRegion -[:HAS_SUBREGION]-> AnatomyRegion
 *
 * Idempotent via MERGE on code + institution_id.
 */

import { neo4jQuery } from '@journey/neo4j/client'
import { randomUUID } from 'crypto'

// ---------------------------------------------------------------------------
// Data — medically accurate anatomy regions
// ---------------------------------------------------------------------------

interface AnatomyRegionData {
  code: string
  name: string
  subRegions: Array<{
    code: string
    name: string
  }>
}

const ANATOMY_REGIONS: AnatomyRegionData[] = [
  {
    code: 'ANAT-HN',
    name: 'Head and Neck',
    subRegions: [
      { code: 'ANAT-HN-CRAN', name: 'Cranium' },
      { code: 'ANAT-HN-FACE', name: 'Face' },
      { code: 'ANAT-HN-ORAL', name: 'Oral Cavity' },
      { code: 'ANAT-HN-PHAR', name: 'Pharynx' },
      { code: 'ANAT-HN-LARY', name: 'Larynx' },
      { code: 'ANAT-HN-NECK', name: 'Neck' },
      { code: 'ANAT-HN-ORBT', name: 'Orbit' },
      { code: 'ANAT-HN-EAR', name: 'Ear' },
      { code: 'ANAT-HN-NASL', name: 'Nasal Cavity' },
    ],
  },
  {
    code: 'ANAT-THX',
    name: 'Thorax',
    subRegions: [
      { code: 'ANAT-THX-WALL', name: 'Thoracic Wall' },
      { code: 'ANAT-THX-MEDI', name: 'Mediastinum' },
      { code: 'ANAT-THX-LUNG', name: 'Lungs' },
      { code: 'ANAT-THX-HEAR', name: 'Heart' },
      { code: 'ANAT-THX-GVES', name: 'Great Vessels' },
      { code: 'ANAT-THX-DIAP', name: 'Diaphragm' },
    ],
  },
  {
    code: 'ANAT-ABD',
    name: 'Abdomen',
    subRegions: [
      { code: 'ANAT-ABD-WALL', name: 'Abdominal Wall' },
      { code: 'ANAT-ABD-PERI', name: 'Peritoneal Cavity' },
      { code: 'ANAT-ABD-GIT', name: 'GI Tract' },
      { code: 'ANAT-ABD-HBIL', name: 'Hepatobiliary' },
      { code: 'ANAT-ABD-PANS', name: 'Pancreas/Spleen' },
      { code: 'ANAT-ABD-RETR', name: 'Retroperitoneum' },
    ],
  },
  {
    code: 'ANAT-PEL',
    name: 'Pelvis and Perineum',
    subRegions: [
      { code: 'ANAT-PEL-WALL', name: 'Pelvic Walls' },
      { code: 'ANAT-PEL-FLOR', name: 'Pelvic Floor' },
      { code: 'ANAT-PEL-BLAD', name: 'Urinary Bladder' },
      { code: 'ANAT-PEL-RECT', name: 'Rectum/Anal Canal' },
    ],
  },
  {
    code: 'ANAT-UL',
    name: 'Upper Limb',
    subRegions: [
      { code: 'ANAT-UL-SHLR', name: 'Shoulder' },
      { code: 'ANAT-UL-ARM', name: 'Arm' },
      { code: 'ANAT-UL-FARM', name: 'Forearm' },
      { code: 'ANAT-UL-HAND', name: 'Hand' },
      { code: 'ANAT-UL-BPLX', name: 'Brachial Plexus' },
    ],
  },
  {
    code: 'ANAT-LL',
    name: 'Lower Limb',
    subRegions: [
      { code: 'ANAT-LL-HIP', name: 'Hip' },
      { code: 'ANAT-LL-THGH', name: 'Thigh' },
      { code: 'ANAT-LL-KNEE', name: 'Knee' },
      { code: 'ANAT-LL-LEG', name: 'Leg' },
      { code: 'ANAT-LL-FOOT', name: 'Foot' },
      { code: 'ANAT-LL-LPLX', name: 'Lumbosacral Plexus' },
    ],
  },
  {
    code: 'ANAT-BACK',
    name: 'Back',
    subRegions: [
      { code: 'ANAT-BACK-VERT', name: 'Vertebral Column' },
      { code: 'ANAT-BACK-CORD', name: 'Spinal Cord' },
      { code: 'ANAT-BACK-MUSC', name: 'Back Muscles' },
    ],
  },
  {
    code: 'ANAT-NEURO',
    name: 'Neuroanatomy',
    subRegions: [
      { code: 'ANAT-NEURO-CRTX', name: 'Cerebral Cortex' },
      { code: 'ANAT-NEURO-BSTM', name: 'Brainstem' },
      { code: 'ANAT-NEURO-CRBL', name: 'Cerebellum' },
      { code: 'ANAT-NEURO-BGNG', name: 'Basal Ganglia' },
      { code: 'ANAT-NEURO-THAL', name: 'Thalamus/Hypothalamus' },
      { code: 'ANAT-NEURO-VENT', name: 'Ventricular System' },
      { code: 'ANAT-NEURO-CRNR', name: 'Cranial Nerves' },
      { code: 'ANAT-NEURO-SPNL', name: 'Spinal Tracts' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedAnatomyRegions(): Promise<void> {
  const institutionId = process.env.INSTITUTION_ID ?? 'msm-default'
  const ctx = { institution_id: institutionId }

  console.log('[seed:04] Seeding anatomy regions...')

  let errors = 0

  for (const region of ANATOMY_REGIONS) {
    // MERGE top-level region — parent_code is null
    const regionResult = await neo4jQuery(
      `MERGE (r:AnatomyRegion {code: $code, institution_id: $institution_id})
       ON CREATE SET
         r.uuid = $uuid,
         r.name = $name,
         r.parent_code = null
       ON MATCH SET
         r.name = $name,
         r.parent_code = null`,
      {
        code: region.code,
        uuid: randomUUID(),
        name: region.name,
      },
      ctx
    )
    if (!regionResult) {
      console.error(`  ✗ Failed: AnatomyRegion (${region.name})`)
      errors++
    }

    // MERGE each sub-region and edge
    for (const sub of region.subRegions) {
      const subResult = await neo4jQuery(
        `MERGE (sr:AnatomyRegion {code: $subCode, institution_id: $institution_id})
         ON CREATE SET
           sr.uuid = $uuid,
           sr.name = $name,
           sr.parent_code = $parentCode
         ON MATCH SET
           sr.name = $name,
           sr.parent_code = $parentCode
         WITH sr
         MATCH (parent:AnatomyRegion {code: $parentCode, institution_id: $institution_id})
         MERGE (parent)-[:HAS_SUBREGION]->(sr)`,
        {
          subCode: sub.code,
          uuid: randomUUID(),
          name: sub.name,
          parentCode: region.code,
        },
        ctx
      )
      if (!subResult) {
        console.error(`  ✗ Failed: AnatomyRegion sub-region (${sub.name})`)
        errors++
      }
    }
  }

  const totalSubs = ANATOMY_REGIONS.reduce(
    (sum, r) => sum + r.subRegions.length,
    0
  )
  if (errors > 0) {
    console.error(`[seed:04] ⚠ ${errors} nodes failed`)
    throw new Error(`[seed:04] ${errors} nodes failed to seed`)
  }
  console.log(
    `[seed:04] Done — ${ANATOMY_REGIONS.length} top-level regions, ${totalSubs} sub-regions (${ANATOMY_REGIONS.length + totalSubs} total)`
  )
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  seedAnatomyRegions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed:04] FAILED:', err)
      process.exit(1)
    })
}
