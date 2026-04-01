/**
 * scripts/seeds/07-ipec-care-phase.ts
 *
 * Seeds IPEC Core Competency domains + sub-competencies and CarePhase nodes
 * into Neo4j.
 *
 * Node types:
 *   IPEC_Competency     — uuid, domain, code, title, institution_id
 *   IPEC_SubCompetency  — uuid, code, title, domain_code, institution_id
 *   Edge: IPEC_Competency -[:HAS_SUBCOMPETENCY]-> IPEC_SubCompetency
 *
 *   CarePhase           — uuid, name, ordinal, institution_id
 *
 * Idempotent via MERGE on code + institution_id (or name + institution_id for CarePhase).
 */

import { neo4jQuery } from '@journey/neo4j/client'
import { randomUUID } from 'crypto'

// ---------------------------------------------------------------------------
// IPEC Data
// ---------------------------------------------------------------------------

interface IPECDomain {
  code: string
  domain: string
  title: string
  subCompetencies: Array<{
    code: string
    title: string
  }>
}

const IPEC_DOMAINS: IPECDomain[] = [
  {
    code: 'VE',
    domain: 'Values/Ethics',
    title: 'Values/Ethics for Interprofessional Practice',
    subCompetencies: [
      { code: 'VE-1', title: 'Place interests of patients and populations at the center of interprofessional health care delivery' },
      { code: 'VE-2', title: 'Respect the dignity and privacy of patients while maintaining confidentiality' },
      { code: 'VE-3', title: 'Embrace cultural diversity and individual differences' },
      { code: 'VE-4', title: 'Respect the unique cultures, values, roles, and responsibilities of other health professions' },
      { code: 'VE-5', title: 'Work with individuals of other professions to maintain mutual respect and shared values' },
      { code: 'VE-6', title: 'Develop a trusting relationship with patients, families, and other team members' },
      { code: 'VE-7', title: 'Demonstrate high standards of ethical conduct in interprofessional contributions' },
      { code: 'VE-8', title: 'Manage ethical dilemmas in interprofessional practice' },
      { code: 'VE-9', title: 'Act with honesty and integrity in relationships with patients, families, and team members' },
      { code: 'VE-10', title: 'Maintain competence in one\'s own profession appropriate to scope of practice' },
    ],
  },
  {
    code: 'RR',
    domain: 'Roles/Responsibilities',
    title: 'Roles/Responsibilities',
    subCompetencies: [
      { code: 'RR-1', title: 'Communicate one\'s roles and responsibilities clearly to patients, families, and professionals' },
      { code: 'RR-2', title: 'Recognize one\'s limitations in skills, knowledge, and abilities' },
      { code: 'RR-3', title: 'Engage diverse professionals who complement one\'s own expertise to optimize care' },
      { code: 'RR-4', title: 'Explain the roles and responsibilities of other care providers' },
      { code: 'RR-5', title: 'Use the full scope of knowledge, skills, and abilities of professionals to provide care' },
      { code: 'RR-6', title: 'Communicate with team members to clarify each member\'s responsibility' },
      { code: 'RR-7', title: 'Forge interdependent relationships with other professions to improve care and learning' },
      { code: 'RR-8', title: 'Engage in continuous professional and interprofessional development' },
      { code: 'RR-9', title: 'Use unique and complementary abilities of all members of the team' },
      { code: 'RR-10', title: 'Describe how professionals in health and other fields can collaborate' },
    ],
  },
  {
    code: 'CC',
    domain: 'Interprofessional Communication',
    title: 'Interprofessional Communication',
    subCompetencies: [
      { code: 'CC-1', title: 'Choose effective communication tools and techniques for interprofessional interactions' },
      { code: 'CC-2', title: 'Communicate information with patients, families, and team members in an understandable form' },
      { code: 'CC-3', title: 'Express one\'s knowledge and opinions to team members with confidence, clarity, and respect' },
      { code: 'CC-4', title: 'Listen actively and encourage ideas and opinions of other team members' },
      { code: 'CC-5', title: 'Give timely, sensitive, instructive feedback to others about their performance' },
      { code: 'CC-6', title: 'Use respectful language in difficult situations, conflict, and disagreements' },
      { code: 'CC-7', title: 'Recognize how one\'s uniqueness contributes to effective communication and conflict resolution' },
      { code: 'CC-8', title: 'Communicate consistently the importance of teamwork to patients, families, and community' },
    ],
  },
  {
    code: 'TT',
    domain: 'Teams and Teamwork',
    title: 'Teams and Teamwork',
    subCompetencies: [
      { code: 'TT-1', title: 'Describe the process of team development and the roles of team members' },
      { code: 'TT-2', title: 'Develop consensus on ethical principles to guide team process' },
      { code: 'TT-3', title: 'Engage health and other professionals in shared problem-solving' },
      { code: 'TT-4', title: 'Integrate the knowledge and experience of other professions to inform care decisions' },
      { code: 'TT-5', title: 'Apply leadership practices that support collaborative practice' },
      { code: 'TT-6', title: 'Engage self and others to constructively manage disagreements about care' },
      { code: 'TT-7', title: 'Share accountability with other professions, patients, and communities for health outcomes' },
      { code: 'TT-8', title: 'Reflect on individual and team performance for continuous improvement' },
      { code: 'TT-9', title: 'Use process improvement strategies to increase the effectiveness of interprofessional teamwork' },
      { code: 'TT-10', title: 'Use available evidence to inform effective teamwork and team-based practices' },
    ],
  },
]

// ---------------------------------------------------------------------------
// CarePhase Data
// ---------------------------------------------------------------------------

interface CarePhaseData {
  name: string
  ordinal: number
}

const CARE_PHASES: CarePhaseData[] = [
  { name: 'Prevention', ordinal: 1 },
  { name: 'Screening', ordinal: 2 },
  { name: 'Diagnosis', ordinal: 3 },
  { name: 'Treatment', ordinal: 4 },
  { name: 'Monitoring', ordinal: 5 },
  { name: 'Palliative Care', ordinal: 6 },
  { name: 'Rehabilitation', ordinal: 7 },
]

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedIPECAndCarePhase(): Promise<void> {
  const institutionId = process.env.INSTITUTION_ID ?? 'msm-default'
  const ctx = { institution_id: institutionId }

  // ---- IPEC Competencies ----
  console.log('[seed:07] Seeding IPEC competency domains and sub-competencies...')

  for (const domain of IPEC_DOMAINS) {
    // MERGE domain node
    await neo4jQuery(
      `MERGE (c:IPEC_Competency {code: $code, institution_id: $institution_id})
       ON CREATE SET
         c.uuid = $uuid,
         c.domain = $domain,
         c.title = $title
       ON MATCH SET
         c.domain = $domain,
         c.title = $title`,
      {
        code: domain.code,
        uuid: randomUUID(),
        domain: domain.domain,
        title: domain.title,
      },
      ctx
    )

    // MERGE each sub-competency and edge
    for (const sub of domain.subCompetencies) {
      await neo4jQuery(
        `MERGE (sc:IPEC_SubCompetency {code: $subCode, institution_id: $institution_id})
         ON CREATE SET
           sc.uuid = $uuid,
           sc.title = $title,
           sc.domain_code = $domainCode
         ON MATCH SET
           sc.title = $title,
           sc.domain_code = $domainCode
         WITH sc
         MATCH (c:IPEC_Competency {code: $domainCode, institution_id: $institution_id})
         MERGE (c)-[:HAS_SUBCOMPETENCY]->(sc)`,
        {
          subCode: sub.code,
          uuid: randomUUID(),
          title: sub.title,
          domainCode: domain.code,
        },
        ctx
      )
    }
  }

  const totalSubs = IPEC_DOMAINS.reduce(
    (sum, d) => sum + d.subCompetencies.length,
    0
  )
  console.log(
    `[seed:07] IPEC done — ${IPEC_DOMAINS.length} domains, ${totalSubs} sub-competencies`
  )

  // ---- CarePhase nodes ----
  console.log('[seed:07] Seeding CarePhase nodes...')

  for (const phase of CARE_PHASES) {
    await neo4jQuery(
      `MERGE (cp:CarePhase {name: $name, institution_id: $institution_id})
       ON CREATE SET
         cp.uuid = $uuid,
         cp.ordinal = $ordinal
       ON MATCH SET
         cp.ordinal = $ordinal`,
      {
        name: phase.name,
        uuid: randomUUID(),
        ordinal: phase.ordinal,
      },
      ctx
    )
  }

  console.log(`[seed:07] CarePhase done — ${CARE_PHASES.length} phases`)
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  seedIPECAndCarePhase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed:07] FAILED:', err)
      process.exit(1)
    })
}
