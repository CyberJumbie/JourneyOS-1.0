/**
 * scripts/seeds/04-anatomy-regions.ts
 *
 * Seeds anatomy region hierarchy into Neo4j.
 * Top-level regions with sub-regions.
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
// Data
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
      { code: 'ANAT-HN-NEKT', name: 'Neck Triangles' },
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
      { code: 'ANAT-ABD-WALL', name: 'Anterior Abdominal Wall' },
      { code: 'ANAT-ABD-PERI', name: 'Peritoneal Cavity' },
      { code: 'ANAT-ABD-GIT', name: 'GI Tract' },
      { code: 'ANAT-ABD-LIVG', name: 'Liver/Gallbladder' },
      { code: 'ANAT-ABD-PANS', name: 'Pancreas/Spleen' },
      { code: 'ANAT-ABD-KIDU', name: 'Kidneys/Ureters' },
      { code: 'ANAT-ABD-RETR', name: 'Retroperitoneum' },
    ],
  },
  {
    code: 'ANAT-PEL',
    name: 'Pelvis and Perineum',
    subRegions: [
      { code: 'ANAT-PEL-WALL', name: 'Pelvic Walls' },
      { code: 'ANAT-PEL-FLOR', name: 'Pelvic Floor' },
      { code: 'ANAT-PEL-MALE', name: 'Male Reproductive' },
      { code: 'ANAT-PEL-FEML', name: 'Female Reproductive' },
      { code: 'ANAT-PEL-BLAD', name: 'Urinary Bladder' },
      { code: 'ANAT-PEL-RECT', name: 'Rectum/Anal Canal' },
    ],
  },
  {
    code: 'ANAT-UPR',
    name: 'Upper Limb',
    subRegions: [
      { code: 'ANAT-UPR-SHLR', name: 'Shoulder' },
      { code: 'ANAT-UPR-ARM', name: 'Arm' },
      { code: 'ANAT-UPR-FARM', name: 'Forearm' },
      { code: 'ANAT-UPR-HAND', name: 'Hand' },
      { code: 'ANAT-UPR-BPLX', name: 'Brachial Plexus' },
    ],
  },
  {
    code: 'ANAT-LWR',
    name: 'Lower Limb',
    subRegions: [
      { code: 'ANAT-LWR-HIP', name: 'Hip' },
      { code: 'ANAT-LWR-THGH', name: 'Thigh' },
      { code: 'ANAT-LWR-KNEE', name: 'Knee' },
      { code: 'ANAT-LWR-LEG', name: 'Leg' },
      { code: 'ANAT-LWR-FOOT', name: 'Foot' },
      { code: 'ANAT-LWR-LPLX', name: 'Lumbosacral Plexus' },
    ],
  },
  {
    code: 'ANAT-BCK',
    name: 'Back',
    subRegions: [
      { code: 'ANAT-BCK-VERT', name: 'Vertebral Column' },
      { code: 'ANAT-BCK-CORD', name: 'Spinal Cord' },
      { code: 'ANAT-BCK-MUSC', name: 'Back Muscles' },
    ],
  },
  {
    code: 'ANAT-NEU',
    name: 'Neuroanatomy',
    subRegions: [
      { code: 'ANAT-NEU-CRTX', name: 'Cerebral Cortex' },
      { code: 'ANAT-NEU-BSTM', name: 'Brainstem' },
      { code: 'ANAT-NEU-CRBL', name: 'Cerebellum' },
      { code: 'ANAT-NEU-BGNG', name: 'Basal Ganglia' },
      { code: 'ANAT-NEU-THAL', name: 'Thalamus/Hypothalamus' },
      { code: 'ANAT-NEU-VENT', name: 'Ventricular System' },
      { code: 'ANAT-NEU-CRNR', name: 'Cranial Nerves' },
      { code: 'ANAT-NEU-SPNL', name: 'Spinal Tracts' },
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

  for (const region of ANATOMY_REGIONS) {
    // MERGE top-level region — parent_code is null
    await neo4jQuery(
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

    // MERGE each sub-region and edge
    for (const sub of region.subRegions) {
      await neo4jQuery(
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
    }
  }

  const totalSubs = ANATOMY_REGIONS.reduce(
    (sum, r) => sum + r.subRegions.length,
    0
  )
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
