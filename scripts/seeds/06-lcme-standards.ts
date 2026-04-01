/**
 * scripts/seeds/06-lcme-standards.ts
 *
 * Seeds LCME accreditation standards and elements into Neo4j.
 * 12 standards with element-level granularity.
 *
 * Node types:
 *   LCME_Standard  — uuid, code, title, description, institution_id
 *   LCME_Element   — uuid, code, title, description, standard_code, institution_id
 *   Edge: LCME_Standard -[:HAS_ELEMENT]-> LCME_Element
 *
 * Idempotent via MERGE on code + institution_id.
 */

import { neo4jQuery } from '@journey/neo4j/client'
import { randomUUID } from 'crypto'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface LCMEStandard {
  code: string
  title: string
  description: string
  elements: Array<{
    code: string
    title: string
    description: string
  }>
}

const LCME_STANDARDS: LCMEStandard[] = [
  {
    code: 'LCME-01',
    title: 'Mission, Planning, Organization, and Integrity',
    description:
      'A medical school has a written statement of mission and goals for the medical education program, conducts ongoing planning, and has an organizational structure that allows it to fulfill its mission.',
    elements: [
      { code: '1.1', title: 'Strategic Planning and Continuous Quality Improvement', description: 'A medical school engages in ongoing planning and continuous quality improvement processes that establish short and long-term programmatic goals.' },
      { code: '1.2', title: 'Conflict of Interest Policies', description: 'A medical school has in place policies and procedures to prevent or manage conflicts of interest.' },
      { code: '1.3', title: 'Mechanisms for Faculty, Student, and Community Participation', description: 'The faculty, students, and community have meaningful participation in decision-making.' },
    ],
  },
  {
    code: 'LCME-02',
    title: 'Leadership and Administration',
    description:
      'A medical school has effective leadership and administrative structures to fulfill its mission and goals.',
    elements: [
      { code: '2.1', title: 'Administrative Officer and Faculty', description: 'A medical school has administrative officers with appropriate authority to oversee the educational program.' },
      { code: '2.2', title: 'Dean Qualifications', description: 'The dean is qualified by education, training, and experience to serve as chief academic officer.' },
      { code: '2.3', title: 'Access and Authority of the Dean', description: 'The dean has sufficient access and authority to fulfill responsibilities.' },
      { code: '2.4', title: 'Sufficiency of Administrative Staff', description: 'Administrative staff sufficient to support the educational program.' },
      { code: '2.5', title: 'Responsibility of and to the Dean', description: 'Faculty report to and are accountable to the dean for their educational responsibilities.' },
    ],
  },
  {
    code: 'LCME-03',
    title: 'Academic and Learning Environments',
    description:
      'A medical school ensures that its academic and learning environments promote the acquisition of knowledge, skills, behaviors, and attitudes required of physicians.',
    elements: [
      { code: '3.1', title: 'Resident Participation in Medical Student Education', description: 'Residents who supervise or teach medical students are prepared for their roles.' },
      { code: '3.2', title: 'Community of Scholars/Research Opportunities', description: 'A medical school provides a community of scholars and research opportunities.' },
      { code: '3.3', title: 'Diversity/Pipeline Programs and Partnerships', description: 'A medical school promotes diversity and has pipeline programs.' },
      { code: '3.4', title: 'Anti-Discrimination Policies', description: 'A medical school has policies that prohibit discrimination.' },
      { code: '3.5', title: 'Learning Environment', description: 'The learning environment is conducive to the ongoing development of explicit and tacit knowledge.' },
      { code: '3.6', title: 'Student Mistreatment', description: 'A medical school defines mistreatment, has policies to prevent and respond to mistreatment.' },
    ],
  },
  {
    code: 'LCME-04',
    title: 'Faculty Preparation, Productivity, Participation, and Policies',
    description:
      'A medical school has sufficient faculty who are qualified by education, training, and experience to serve as educators, investigators, and clinicians.',
    elements: [
      { code: '4.1', title: 'Sufficiency of Faculty', description: 'A medical school has in place a sufficient number of faculty in each discipline.' },
      { code: '4.2', title: 'Scholarly Productivity', description: 'Faculty engage in scholarly productivity including research and scholarly writing.' },
      { code: '4.3', title: 'Faculty Appointment Policies', description: 'Faculty have defined appointment, renewal, promotion, granting of tenure, and dismissal policies.' },
      { code: '4.4', title: 'Feedback to Faculty', description: 'Faculty receive regular feedback on their academic activities and performance.' },
      { code: '4.5', title: 'Faculty Professional Development', description: 'Faculty have opportunities for professional development.' },
      { code: '4.6', title: 'Responsibility for Educational Program Policies', description: 'Faculty collectively determine the educational program policies.' },
    ],
  },
  {
    code: 'LCME-05',
    title: 'Educational Resources and Infrastructure',
    description:
      'A medical school has sufficient educational resources and infrastructure to support its educational programs.',
    elements: [
      { code: '5.1', title: 'Adequate Financial Resources', description: 'A medical school has adequate financial resources to support its educational program.' },
      { code: '5.2', title: 'Dean Authority over Resources', description: 'The dean has authority over educational resources.' },
      { code: '5.3', title: 'Pressures for Self-Financing', description: 'The school does not place undue pressure on faculty for revenue generation.' },
      { code: '5.4', title: 'Sufficiency of Buildings and Equipment', description: 'Buildings and equipment are adequate for the educational program.' },
      { code: '5.5', title: 'Resources for Clinical Instruction', description: 'Resources and clinical sites are adequate for clinical instruction.' },
      { code: '5.6', title: 'Clinical Instructional Facility/Site Affiliations', description: 'Clinical teaching sites have appropriate affiliation agreements.' },
      { code: '5.7', title: 'Security, Study, Lounge, and Storage Facilities', description: 'Students have access to adequate security, study, lounge, and storage facilities.' },
      { code: '5.8', title: 'Library Resources/Staff', description: 'Library resources and staff are adequate for the educational program.' },
    ],
  },
  {
    code: 'LCME-06',
    title: 'Competencies, Curricular Objectives, and Curricular Design',
    description:
      'The faculty of a medical school define the competencies to be achieved by the educational program through medical education program objectives and support the achievement through curricular design.',
    elements: [
      { code: '6.1', title: 'Program and Learning Objectives', description: 'The faculty define program objectives and learning objectives.' },
      { code: '6.2', title: 'Required Clinical Experiences', description: 'Required clinical experiences include the core clinical disciplines.' },
      { code: '6.3', title: 'Self-Directed and Life-Long Learning', description: 'The curriculum includes self-directed learning experiences.' },
      { code: '6.4', title: 'Societal Problems', description: 'The curriculum addresses societal health needs and problems.' },
      { code: '6.5', title: 'Cultural Competence and Health Care Disparities', description: 'The curriculum prepares students to recognize and address health care disparities.' },
      { code: '6.6', title: 'Service-Learning', description: 'The curriculum includes service-learning experiences.' },
    ],
  },
  {
    code: 'LCME-07',
    title: 'Curricular Content',
    description:
      'The faculty of a medical school ensure that the medical curriculum provides content of sufficient breadth and depth to prepare students for entry into any residency program.',
    elements: [
      { code: '7.1', title: 'Biomedical, Behavioral, Social Sciences', description: 'The curriculum includes the biomedical, behavioral, and social sciences.' },
      { code: '7.2', title: 'Organ Systems/Life Cycle/Primary Care/Prevention/Wellness', description: 'The curriculum covers organ systems, life cycle, primary care, prevention, and wellness.' },
      { code: '7.3', title: 'Scientific Method/Clinical/Translational Research', description: 'The curriculum includes the scientific method and research.' },
      { code: '7.4', title: 'Critical Judgment/Problem-Solving Skills', description: 'The curriculum develops critical judgment and problem-solving skills.' },
      { code: '7.5', title: 'Societal Problems', description: 'The curriculum addresses societal problems including substance abuse and violence.' },
      { code: '7.6', title: 'Cultural Competence and Health Disparities', description: 'The curriculum prepares students to recognize and address bias and health disparities.' },
      { code: '7.7', title: 'Medical Ethics', description: 'The curriculum includes instruction in medical ethics and human values.' },
      { code: '7.8', title: 'Communication Skills', description: 'The curriculum includes communication skills training.' },
    ],
  },
  {
    code: 'LCME-08',
    title: 'Curricular Management, Evaluation, and Enhancement',
    description:
      'The faculty of a medical school engage in curricular revision and program evaluation.',
    elements: [
      { code: '8.1', title: 'Curricular Management', description: 'The faculty oversee the curricular management structure.' },
      { code: '8.2', title: 'Use of Medical Educational Program Objectives', description: 'Medical education program objectives guide curricular design.' },
      { code: '8.3', title: 'Curricular Design, Review, Revision/Content Monitoring', description: 'Ongoing monitoring and revision of curricular content.' },
      { code: '8.4', title: 'Program Evaluation', description: 'The faculty conduct ongoing program evaluation.' },
      { code: '8.5', title: 'Medical Student Feedback', description: 'Student feedback is systematically collected and used.' },
      { code: '8.6', title: 'Monitoring of Completion of Required Clinical Experiences', description: 'Students are monitored for completion of required clinical experiences.' },
      { code: '8.7', title: 'Comparability of Education/Assessment', description: 'Comparable educational experiences and assessment methods across sites.' },
    ],
  },
  {
    code: 'LCME-09',
    title: 'Teaching, Supervision, Assessment, and Student and Patient Safety',
    description:
      'A medical school ensures that medical students are taught and supervised, and that their performance is assessed.',
    elements: [
      { code: '9.1', title: 'Preparation of Resident and Non-Faculty Instructors', description: 'Residents and non-faculty instructors are prepared for their teaching roles.' },
      { code: '9.2', title: 'Faculty Appointments', description: 'Physicians who teach and supervise students hold appropriate faculty appointments.' },
      { code: '9.3', title: 'Clinical Supervision of Medical Students', description: 'Students receive appropriate clinical supervision.' },
      { code: '9.4', title: 'Assessment System', description: 'Assessment methods are valid, reliable, and fair.' },
      { code: '9.5', title: 'Narrative Assessment', description: 'Students receive narrative assessment during clinical experiences.' },
      { code: '9.6', title: 'Setting Standards of Achievement', description: 'The faculty set standards for student achievement.' },
      { code: '9.7', title: 'Formative Assessment and Feedback', description: 'Students receive formative assessment and feedback.' },
      { code: '9.8', title: 'Fair and Timely Summative Assessment', description: 'Summative assessment is fair and timely.' },
    ],
  },
  {
    code: 'LCME-10',
    title: 'Medical Student Selection, Assignment, and Progress',
    description:
      'A medical school establishes policies and procedures for medical student selection, assignment, and progress.',
    elements: [
      { code: '10.1', title: 'Premedical Education/Required Courses', description: 'The school publishes admission requirements.' },
      { code: '10.2', title: 'Final Authority for Admissions', description: 'The admission committee has final authority for student selection.' },
      { code: '10.3', title: 'Policies Regarding Student Selection', description: 'Student selection policies are documented and applied consistently.' },
      { code: '10.4', title: 'Characteristics and State of Development of Admitted Students', description: 'The school monitors characteristics of admitted students.' },
      { code: '10.5', title: 'Technical Standards', description: 'The school has technical standards for admission, retention, and graduation.' },
      { code: '10.6', title: 'Content of Informational Materials', description: 'Informational materials are accurate and current.' },
    ],
  },
  {
    code: 'LCME-11',
    title: 'Medical Student Academic Support, Career Advising, and Educational Records',
    description:
      'A medical school provides effective academic support and career advising to its medical students.',
    elements: [
      { code: '11.1', title: 'Academic Advising', description: 'Students have access to effective academic advising.' },
      { code: '11.2', title: 'Career Advising', description: 'Students have access to effective career advising.' },
      { code: '11.3', title: 'Mentoring/Academic Environment', description: 'Students have access to mentoring.' },
      { code: '11.4', title: 'Interpretation of Medical Student Performance', description: 'The school provides mechanisms for interpreting student performance.' },
      { code: '11.5', title: 'Confidentiality of Student Educational Records', description: 'Student educational records are maintained with appropriate confidentiality.' },
      { code: '11.6', title: 'Student Access to Educational Records', description: 'Students have access to their educational records.' },
    ],
  },
  {
    code: 'LCME-12',
    title: 'Medical Student Health Services, Personal Counseling, and Financial Aid',
    description:
      'A medical school provides effective health services and counseling for its medical students.',
    elements: [
      { code: '12.1', title: 'Financial Aid/Debt Management Counseling/Student Educational Debt', description: 'The school provides financial aid and debt management counseling.' },
      { code: '12.2', title: 'Student Health and Disability Insurance', description: 'Students have access to health and disability insurance.' },
      { code: '12.3', title: 'Personal Counseling/Well-Being Programs', description: 'Students have access to personal counseling and well-being programs.' },
      { code: '12.4', title: 'Student Access to Health Care Services', description: 'Students have access to health care services.' },
      { code: '12.5', title: 'Non-Involvement of Providers in Student Assessment', description: 'Providers of student health care are not involved in academic assessment.' },
      { code: '12.6', title: 'Student Health Records', description: 'Student health records are maintained with appropriate confidentiality.' },
    ],
  },
]

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedLCMEStandards(): Promise<void> {
  const institutionId = process.env.INSTITUTION_ID ?? 'msm-default'
  const ctx = { institution_id: institutionId }

  console.log('[seed:06] Seeding LCME standards and elements...')

  for (const standard of LCME_STANDARDS) {
    // MERGE standard node — idempotent on code + institution_id
    await neo4jQuery(
      `MERGE (s:LCME_Standard {code: $code, institution_id: $institution_id})
       ON CREATE SET
         s.uuid = $uuid,
         s.title = $title,
         s.description = $description
       ON MATCH SET
         s.title = $title,
         s.description = $description`,
      {
        code: standard.code,
        uuid: randomUUID(),
        title: standard.title,
        description: standard.description,
      },
      ctx
    )

    // MERGE each element and its edge
    for (const element of standard.elements) {
      await neo4jQuery(
        `MERGE (e:LCME_Element {code: $elementCode, institution_id: $institution_id})
         ON CREATE SET
           e.uuid = $uuid,
           e.title = $title,
           e.description = $description,
           e.standard_code = $standardCode
         ON MATCH SET
           e.title = $title,
           e.description = $description,
           e.standard_code = $standardCode
         WITH e
         MATCH (s:LCME_Standard {code: $standardCode, institution_id: $institution_id})
         MERGE (s)-[:HAS_ELEMENT]->(e)`,
        {
          elementCode: element.code,
          uuid: randomUUID(),
          title: element.title,
          description: element.description,
          standardCode: standard.code,
        },
        ctx
      )
    }
  }

  const totalElements = LCME_STANDARDS.reduce(
    (sum, s) => sum + s.elements.length,
    0
  )
  console.log(
    `[seed:06] Done — ${LCME_STANDARDS.length} standards, ${totalElements} elements`
  )
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  seedLCMEStandards()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed:06] FAILED:', err)
      process.exit(1)
    })
}
