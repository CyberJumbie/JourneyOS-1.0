/**
 * scripts/seeds/08-few-shot-examples.ts
 *
 * Seeds FewShotExample nodes into Neo4j and links them to TaskShells via EXEMPLIFIES.
 * 8 gold-standard USMLE-style vignettes: 2 per concept family (diagnosis, mechanism,
 * next_step, test_selection).
 *
 * Idempotent: uses MERGE on example_id + institution_id.
 *
 * Run: pnpm tsx scripts/seeds/08-few-shot-examples.ts
 */

import { neo4jQuery } from '../../packages/neo4j/client'

const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'

interface FewShotExampleData {
  example_id: string
  item_type: string
  task_shell_id: string
  quality_score: number
  content: {
    stem: string
    lead_in: string
    options: Array<{ label: string; text: string; is_correct: boolean }>
    explanation: string
  }
}

const FEW_SHOT_EXAMPLES: FewShotExampleData[] = [
  // ── diagnosis (2 examples) ──────────────────────────────────────────────
  {
    example_id: 'fse-dx-inferior-stemi',
    item_type: 'diagnosis',
    task_shell_id: 'ts-dx-from-presentation',
    quality_score: 0.95,
    content: {
      stem: 'A 58-year-old man with a history of type 2 diabetes mellitus and hypertension presents to the emergency department with sudden onset of severe substernal chest pain radiating to the left arm for the past 45 minutes. He is diaphoretic and nauseated. ECG shows ST-segment elevation in leads II, III, and aVF. Troponin I is elevated at 2.4 ng/mL (normal <0.04 ng/mL).',
      lead_in: 'Which of the following is the most likely diagnosis?',
      options: [
        { label: 'A', text: 'Acute pericarditis', is_correct: false },
        { label: 'B', text: 'Inferior ST-elevation myocardial infarction', is_correct: true },
        { label: 'C', text: 'Pulmonary embolism', is_correct: false },
        { label: 'D', text: 'Aortic dissection', is_correct: false },
        { label: 'E', text: 'Unstable angina', is_correct: false },
      ],
      explanation: 'ST-segment elevation in leads II, III, and aVF with elevated troponin indicates an acute inferior STEMI. The inferior wall is supplied by the right coronary artery in ~85% of patients. Acute pericarditis (A) shows diffuse ST elevation with PR depression. Pulmonary embolism (C) may show right heart strain pattern (S1Q3T3) but not focal ST elevation. Aortic dissection (D) typically presents with tearing chest pain radiating to the back. Unstable angina (E) lacks biomarker elevation.',
    },
  },
  {
    example_id: 'fse-dx-hashimoto',
    item_type: 'diagnosis',
    task_shell_id: 'ts-dx-from-lab',
    quality_score: 0.95,
    content: {
      stem: 'A 32-year-old woman presents with fatigue, weight gain of 15 pounds over 3 months, constipation, and cold intolerance. Physical examination reveals dry skin, periorbital edema, and delayed relaxation of deep tendon reflexes. Laboratory studies show TSH 45 mIU/L (normal 0.4-4.0) and free T4 0.3 ng/dL (normal 0.8-1.8).',
      lead_in: 'Which of the following is the most likely diagnosis?',
      options: [
        { label: 'A', text: 'Graves disease', is_correct: false },
        { label: 'B', text: 'Hashimoto thyroiditis', is_correct: true },
        { label: 'C', text: 'Subacute thyroiditis (de Quervain)', is_correct: false },
        { label: 'D', text: 'Toxic multinodular goiter', is_correct: false },
        { label: 'E', text: 'Euthyroid sick syndrome', is_correct: false },
      ],
      explanation: 'Elevated TSH with low free T4 confirms primary hypothyroidism. In a 32-year-old woman in an iodine-sufficient area, the most common cause is Hashimoto thyroiditis (chronic lymphocytic thyroiditis), an autoimmune condition confirmed by anti-TPO and anti-thyroglobulin antibodies. Graves disease (A) and toxic multinodular goiter (D) cause hyperthyroidism. Subacute thyroiditis (C) typically follows a viral illness with neck pain. Euthyroid sick syndrome (E) shows low T3/T4 with normal or low TSH.',
    },
  },

  // ── mechanism (2 examples) ──────────────────────────────────────────────
  {
    example_id: 'fse-mech-hydroxychloroquine',
    item_type: 'mechanism',
    task_shell_id: 'ts-mechanism-drug',
    quality_score: 0.95,
    content: {
      stem: 'A 55-year-old woman with rheumatoid arthritis is started on methotrexate. After 4 weeks, she develops pancytopenia with a megaloblastic bone marrow.',
      lead_in: 'Which of the following best describes the mechanism of action responsible for this adverse effect?',
      options: [
        { label: 'A', text: 'Inhibition of cyclooxygenase-2', is_correct: false },
        { label: 'B', text: 'Inhibition of dihydrofolate reductase', is_correct: true },
        { label: 'C', text: 'Alkylation of DNA', is_correct: false },
        { label: 'D', text: 'Inhibition of topoisomerase II', is_correct: false },
        { label: 'E', text: 'Inhibition of thymidylate synthase', is_correct: false },
      ],
      explanation: 'Methotrexate inhibits dihydrofolate reductase (DHFR), blocking the conversion of dihydrofolate to tetrahydrofolate. This depletes reduced folate cofactors required for purine and thymidylate synthesis, impairing DNA synthesis in rapidly dividing cells. The resulting megaloblastic anemia and pancytopenia are dose-dependent toxicities. Leucovorin (folinic acid) bypasses the DHFR block and is used as rescue therapy. Thymidylate synthase (E) is the target of 5-fluorouracil, not methotrexate directly.',
    },
  },
  {
    example_id: 'fse-mech-pathophys-ascites',
    item_type: 'mechanism',
    task_shell_id: 'ts-mechanism-pathophysiology',
    quality_score: 0.95,
    content: {
      stem: 'A 52-year-old man with a 20-year history of heavy alcohol use presents with increasing abdominal distension over the past 2 months. Physical examination reveals shifting dullness and a fluid wave. Paracentesis yields straw-colored fluid with a serum-ascites albumin gradient (SAAG) of 2.1 g/dL.',
      lead_in: 'Which of the following best explains the pathophysiological mechanism responsible for this finding?',
      options: [
        { label: 'A', text: 'Decreased oncotic pressure from nephrotic syndrome', is_correct: false },
        { label: 'B', text: 'Portal hypertension from hepatic sinusoidal resistance', is_correct: true },
        { label: 'C', text: 'Increased capillary permeability from peritoneal inflammation', is_correct: false },
        { label: 'D', text: 'Lymphatic obstruction from mesenteric tumor', is_correct: false },
        { label: 'E', text: 'Increased hydrostatic pressure from right heart failure', is_correct: false },
      ],
      explanation: 'A SAAG >= 1.1 g/dL indicates portal hypertension as the cause of ascites. In alcoholic cirrhosis, hepatic fibrosis increases sinusoidal resistance, raising portal venous pressure. This drives splanchnic vasodilation via nitric oxide, activating RAAS and ADH, causing sodium and water retention that accumulates as ascites. Nephrotic syndrome (A) causes ascites through low oncotic pressure (SAAG < 1.1). Peritoneal inflammation (C) causes exudative ascites (SAAG < 1.1). Right heart failure (E) can cause a high SAAG but would present with JVD, peripheral edema, and hepatojugular reflux.',
    },
  },

  // ── next_step (2 examples) ──────────────────────────────────────────────
  {
    example_id: 'fse-next-tension-pneumo',
    item_type: 'next_step',
    task_shell_id: 'ts-next-step-emergency',
    quality_score: 0.95,
    content: {
      stem: 'A 22-year-old man is brought to the emergency department after a motorcycle accident. On arrival, he is unresponsive with a GCS of 6. His blood pressure is 70/40 mmHg, heart rate is 130 bpm, respiratory rate is 28/min, and oxygen saturation is 88% on room air. Physical examination reveals absent breath sounds on the left side with tracheal deviation to the right. Neck veins are distended.',
      lead_in: 'Which of the following is the most appropriate immediate action?',
      options: [
        { label: 'A', text: 'Obtain a chest X-ray', is_correct: false },
        { label: 'B', text: 'Perform needle decompression of the left chest', is_correct: true },
        { label: 'C', text: 'Intubate and begin mechanical ventilation', is_correct: false },
        { label: 'D', text: 'Insert a left-sided chest tube', is_correct: false },
        { label: 'E', text: 'Administer 2 liters of normal saline', is_correct: false },
      ],
      explanation: 'This patient presents with classic tension pneumothorax: hypotension, tachycardia, absent breath sounds on the affected side, tracheal deviation away from the affected side, and distended neck veins. This is a clinical diagnosis requiring immediate needle decompression (large-bore needle in the 2nd intercostal space, midclavicular line) before imaging. Chest tube (D) is definitive but slower; needle decompression is the temporizing bridge. Intubation (C) without decompression worsens pneumothorax via positive pressure ventilation. IV fluids (E) alone will not correct obstructive shock.',
    },
  },
  {
    example_id: 'fse-next-rv-infarct-fluids',
    item_type: 'next_step',
    task_shell_id: 'ts-next-step-management',
    quality_score: 0.95,
    content: {
      stem: 'A 63-year-old man with a history of hypertension presents to the emergency department with severe substernal chest pain for 1 hour. ECG shows ST-segment elevation in leads II, III, and aVF. He is given aspirin, heparin, and morphine. His blood pressure is 82/55 mmHg and heart rate is 48 bpm. Right-sided ECG leads show ST elevation in V4R.',
      lead_in: 'Which of the following is the most appropriate next step in management?',
      options: [
        { label: 'A', text: 'Administer IV nitroglycerin', is_correct: false },
        { label: 'B', text: 'Administer IV normal saline bolus', is_correct: true },
        { label: 'C', text: 'Start dobutamine infusion', is_correct: false },
        { label: 'D', text: 'Place a temporary pacemaker', is_correct: false },
        { label: 'E', text: 'Administer alteplase (tPA)', is_correct: false },
      ],
      explanation: 'ST elevation in V4R confirms right ventricular infarction complicating inferior STEMI. RV infarction causes decreased RV output and reduced LV preload, leading to hypotension. The immediate treatment is IV fluid resuscitation to increase preload. Nitroglycerin (A) is contraindicated as it reduces preload further. Dobutamine (C) may be considered if fluids fail but is not the first step. A temporary pacemaker (D) may be needed for persistent bradycardia but IV fluids address the hypotension first.',
    },
  },

  // ── test_selection (2 examples) ─────────────────────────────────────────
  {
    example_id: 'fse-test-troponin',
    item_type: 'test_selection',
    task_shell_id: 'ts-biomarker-select',
    quality_score: 0.95,
    content: {
      stem: 'A 48-year-old woman presents to the emergency department with acute-onset substernal chest pressure radiating to the jaw for 2 hours. ECG shows no ST-segment changes. The physician wants to evaluate for acute myocardial injury.',
      lead_in: 'Which of the following laboratory tests is most appropriate to confirm or exclude acute myocardial infarction?',
      options: [
        { label: 'A', text: 'CK-MB', is_correct: false },
        { label: 'B', text: 'High-sensitivity troponin I', is_correct: true },
        { label: 'C', text: 'Myoglobin', is_correct: false },
        { label: 'D', text: 'LDH', is_correct: false },
        { label: 'E', text: 'BNP', is_correct: false },
      ],
      explanation: 'High-sensitivity cardiac troponin (hs-cTnI or hs-cTnT) is the preferred biomarker for diagnosis of acute myocardial infarction per current ACC/AHA guidelines. It has superior sensitivity and specificity for myocardial injury compared to CK-MB (A), which was the prior standard but is less sensitive and rises later. Myoglobin (C) rises early but is nonspecific (skeletal muscle). LDH (D) is outdated and nonspecific. BNP (E) is a marker of volume overload and heart failure, not acute myocardial necrosis.',
    },
  },
  {
    example_id: 'fse-test-colon-screening',
    item_type: 'test_selection',
    task_shell_id: 'ts-screening-recommendation',
    quality_score: 0.95,
    content: {
      stem: 'A 46-year-old man presents for a routine health maintenance visit. He has no significant medical history and no family history of cancer. He is asymptomatic and has never had a colonoscopy. His BMI is 28 kg/m2.',
      lead_in: 'According to current USPSTF guidelines, which of the following screening tests is most appropriate at this time?',
      options: [
        { label: 'A', text: 'Colonoscopy', is_correct: true },
        { label: 'B', text: 'Flexible sigmoidoscopy every 10 years', is_correct: false },
        { label: 'C', text: 'CT colonography every 5 years', is_correct: false },
        { label: 'D', text: 'No screening recommended until age 50', is_correct: false },
        { label: 'E', text: 'Annual fecal occult blood test only', is_correct: false },
      ],
      explanation: 'The USPSTF (2021) recommends initiating colorectal cancer screening at age 45 for average-risk adults (previously age 50, updated based on rising incidence in younger adults). Colonoscopy every 10 years is one of several acceptable modalities. This 46-year-old should have already begun screening. Waiting until age 50 (D) reflects outdated guidelines. FIT/FOBT alone (E) is an option but annual, not the sole recommended test. Flexible sigmoidoscopy (B) is every 5 years (with or without FIT), not every 10. CT colonography (C) is every 5 years.',
    },
  },
]

async function seedFewShotExamples(): Promise<void> {
  console.log('--- 08-few-shot-examples: Seeding FewShotExample nodes ---')

  const ctx = { institution_id: INSTITUTION_ID }

  for (const fse of FEW_SHOT_EXAMPLES) {
    const contentStr = JSON.stringify(fse.content)

    // MERGE FewShotExample node on example_id + institution_id
    const result = await neo4jQuery(
      `MERGE (fse:FewShotExample {example_id: $example_id, institution_id: $institution_id})
       ON CREATE SET
         fse.uuid = randomUUID(),
         fse.item_type = $item_type,
         fse.quality_score = $quality_score,
         fse.content = $content,
         fse.created_at = datetime()
       ON MATCH SET
         fse.item_type = $item_type,
         fse.quality_score = $quality_score,
         fse.content = $content,
         fse.updated_at = datetime()
       RETURN fse.uuid AS uuid, fse.example_id AS example_id`,
      {
        example_id: fse.example_id,
        item_type: fse.item_type,
        quality_score: fse.quality_score,
        content: contentStr,
      },
      ctx
    )

    if (result) {
      console.log(`  ✓ FewShotExample (${fse.example_id})`)
    } else {
      console.error(`  ✗ Failed to seed FewShotExample (${fse.example_id}) — Neo4j unavailable`)
    }

    // Create EXEMPLIFIES edge to matching TaskShell by id
    const edgeResult = await neo4jQuery(
      `MATCH (fse:FewShotExample {example_id: $example_id, institution_id: $institution_id})
       MATCH (ts:TaskShell {id: $task_shell_id, institution_id: $institution_id})
       MERGE (fse)-[:EXEMPLIFIES]->(ts)
       RETURN fse.example_id AS example_id, ts.name AS task_shell_name`,
      {
        example_id: fse.example_id,
        task_shell_id: fse.task_shell_id,
      },
      ctx
    )

    if (edgeResult && edgeResult.records.length > 0) {
      console.log(`    → EXEMPLIFIES → ${edgeResult.records[0]?.task_shell_name}`)
    } else {
      console.warn(`    ⚠ Could not link to TaskShell (${fse.task_shell_id}) — run 03-task-shells first`)
    }
  }

  // Verify counts
  const countResult = await neo4jQuery<{ count: number }>(
    `MATCH (fse:FewShotExample {institution_id: $institution_id})
     RETURN count(fse) AS count`,
    {},
    ctx
  )

  const edgeCount = await neo4jQuery<{ count: number }>(
    `MATCH (:FewShotExample {institution_id: $institution_id})-[:EXEMPLIFIES]->(:TaskShell {institution_id: $institution_id})
     RETURN count(*) AS count`,
    {},
    ctx
  )

  if (countResult) {
    console.log(`\n  Total FewShotExample nodes: ${countResult.records[0]?.count}`)
  }
  if (edgeCount) {
    console.log(`  Total EXEMPLIFIES edges: ${edgeCount.records[0]?.count}`)
  }

  console.log('--- 08-few-shot-examples: Done ---\n')
}

// Run if executed directly
seedFewShotExamples().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

export { seedFewShotExamples, FEW_SHOT_EXAMPLES }
