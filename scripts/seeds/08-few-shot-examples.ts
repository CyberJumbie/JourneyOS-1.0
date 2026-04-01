/**
 * scripts/seeds/08-few-shot-examples.ts
 *
 * Seeds FewShotExample nodes into Neo4j and links them to TaskShells via EXEMPLIFIES.
 * Idempotent: uses MERGE on item_type + quality_score + institution_id.
 *
 * Run: pnpm tsx scripts/seeds/08-few-shot-examples.ts
 */

import { neo4jQuery } from '../../packages/neo4j/client'
import { randomUUID } from 'crypto'

const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'

interface FewShotExampleData {
  item_type: string
  quality_score: number
  content: {
    stem: string
    lead_in: string
    options: Array<{ label: string; text: string; is_correct: boolean }>
    explanation: string
  }
}

const FEW_SHOT_EXAMPLES: FewShotExampleData[] = [
  // SBA — Single Best Answer
  {
    item_type: 'SBA',
    quality_score: 0.95,
    content: {
      stem: 'A 58-year-old man with a history of type 2 diabetes mellitus and hypertension presents to the emergency department with sudden onset of severe substernal chest pain radiating to the left arm for the past 45 minutes. He is diaphoretic and nauseated. ECG shows ST-segment elevation in leads II, III, and aVF. Troponin I is elevated at 2.4 ng/mL (normal <0.04 ng/mL). He is given aspirin, heparin, and morphine. His blood pressure is 88/60 mmHg, and heart rate is 52 bpm.',
      lead_in: 'Which of the following is the most appropriate next step in management?',
      options: [
        { label: 'A', text: 'Administer IV nitroglycerin', is_correct: false },
        { label: 'B', text: 'Administer IV normal saline bolus', is_correct: true },
        { label: 'C', text: 'Perform immediate pericardiocentesis', is_correct: false },
        { label: 'D', text: 'Start dobutamine infusion', is_correct: false },
        { label: 'E', text: 'Administer alteplase (tPA)', is_correct: false },
      ],
      explanation: 'This patient presents with an acute inferior STEMI (ST elevation in II, III, aVF) complicated by hypotension and bradycardia, which is characteristic of right ventricular involvement. The right coronary artery supplies the inferior wall and typically the RV. RV infarction causes decreased RV preload to the left ventricle, leading to hypotension. The immediate treatment is IV fluid resuscitation to increase preload. Nitroglycerin (A) is contraindicated because it reduces preload further. Pericardiocentesis (C) is for cardiac tamponade. Dobutamine (D) may be considered if fluids fail but is not the first step. Alteplase (E) is a fibrinolytic and is not preferred when PCI is available; regardless, volume resuscitation takes priority for the hypotension.',
    },
  },
  // EMQ — Extended Matching
  {
    item_type: 'EMQ',
    quality_score: 0.93,
    content: {
      stem: 'A 32-year-old woman presents with fatigue, weight gain of 15 pounds over 3 months, constipation, and cold intolerance. Physical examination reveals dry skin, periorbital edema, and delayed relaxation of deep tendon reflexes. Laboratory studies show TSH 45 mIU/L (normal 0.4-4.0) and free T4 0.3 ng/dL (normal 0.8-1.8).',
      lead_in: 'Which of the following is the most likely diagnosis?',
      options: [
        { label: 'A', text: 'Graves disease', is_correct: false },
        { label: 'B', text: 'Hashimoto thyroiditis', is_correct: true },
        { label: 'C', text: 'Subacute thyroiditis (de Quervain)', is_correct: false },
        { label: 'D', text: 'Toxic multinodular goiter', is_correct: false },
        { label: 'E', text: 'Euthyroid sick syndrome', is_correct: false },
        { label: 'F', text: 'TSH-secreting pituitary adenoma', is_correct: false },
        { label: 'G', text: 'Riedel thyroiditis', is_correct: false },
        { label: 'H', text: 'Postpartum thyroiditis', is_correct: false },
      ],
      explanation: 'The elevated TSH with low free T4 confirms primary hypothyroidism. In a 32-year-old woman, the most common cause of primary hypothyroidism in iodine-sufficient areas is Hashimoto thyroiditis (chronic lymphocytic thyroiditis), an autoimmune condition. Anti-TPO and anti-thyroglobulin antibodies would confirm the diagnosis. Graves disease (A) and toxic multinodular goiter (D) cause hyperthyroidism. Subacute thyroiditis (C) typically follows a viral illness with neck pain. Euthyroid sick syndrome (E) shows low T3/T4 with normal or low TSH. TSH-secreting adenoma (F) would show elevated TSH with elevated T4. Riedel thyroiditis (G) is rare and presents with a rock-hard fixed thyroid.',
    },
  },
  // SIS — Sequential Item Set
  {
    item_type: 'SIS',
    quality_score: 0.94,
    content: {
      stem: 'A 67-year-old man is brought to the emergency department after being found confused at home. His wife reports progressive memory loss over 6 months, but today he became acutely disoriented. Medical history includes atrial fibrillation for which he takes warfarin. On examination, temperature is 37.0°C, blood pressure is 170/95 mmHg, pulse is 88/min and irregularly irregular. He is oriented only to person. There is right-sided hemiparesis with right facial droop. Non-contrast CT of the head shows a hyperdense lesion in the left basal ganglia with surrounding edema.',
      lead_in: 'What is the most likely diagnosis?',
      options: [
        { label: 'A', text: 'Ischemic stroke in the left MCA territory', is_correct: false },
        { label: 'B', text: 'Intracerebral hemorrhage', is_correct: true },
        { label: 'C', text: 'Brain metastasis', is_correct: false },
        { label: 'D', text: 'Brain abscess', is_correct: false },
        { label: 'E', text: 'Subdural hematoma', is_correct: false },
      ],
      explanation: 'A hyperdense lesion on non-contrast CT indicates acute blood. The location in the basal ganglia is the most common site for hypertensive intracerebral hemorrhage. This patient has two major risk factors: hypertension and warfarin anticoagulation. Ischemic stroke (A) appears hypodense on CT (or may not be visible in the first 6 hours). Brain metastasis (C) and abscess (D) would typically show ring enhancement on contrast CT. Subdural hematoma (E) is extra-axial and crescent-shaped.',
    },
  },
  // DRUG — Drug Mechanism
  {
    item_type: 'DRUG',
    quality_score: 0.95,
    content: {
      stem: 'A 45-year-old woman with a history of systemic lupus erythematosus is started on a new medication for lupus nephritis. Three months later, she presents for follow-up. Fundoscopic examination reveals bilateral bull\'s eye maculopathy. She reports no visual symptoms at this time.',
      lead_in: 'Which of the following medications is most likely responsible for this finding?',
      options: [
        { label: 'A', text: 'Methotrexate', is_correct: false },
        { label: 'B', text: 'Cyclophosphamide', is_correct: false },
        { label: 'C', text: 'Hydroxychloroquine', is_correct: true },
        { label: 'D', text: 'Mycophenolate mofetil', is_correct: false },
        { label: 'E', text: 'Azathioprine', is_correct: false },
      ],
      explanation: 'Hydroxychloroquine (and chloroquine) accumulates in melanin-containing structures including the retinal pigment epithelium, causing irreversible retinal toxicity that manifests as bull\'s eye maculopathy. This is a classic board-testable adverse effect. Current guidelines recommend baseline eye examination and annual screening after 5 years of use (or sooner with risk factors). Methotrexate (A) can cause hepatotoxicity and bone marrow suppression. Cyclophosphamide (B) causes hemorrhagic cystitis. Mycophenolate (D) causes GI side effects and bone marrow suppression. Azathioprine (E) causes bone marrow suppression and hepatotoxicity.',
    },
  },
  // LAB — Lab Interpretation
  {
    item_type: 'LAB',
    quality_score: 0.94,
    content: {
      stem: 'A 28-year-old woman presents with recurrent episodes of abdominal pain, anxiety, and dark urine that turns reddish-brown upon standing. She reports that symptoms worsen during her menstrual period and after starting a new oral contraceptive. Laboratory studies show: Sodium 128 mEq/L, potassium 3.2 mEq/L, urine porphobilinogen markedly elevated, urine delta-aminolevulinic acid (ALA) elevated. CBC and liver function tests are normal.',
      lead_in: 'Which of the following is the most likely diagnosis?',
      options: [
        { label: 'A', text: 'Porphyria cutanea tarda', is_correct: false },
        { label: 'B', text: 'Acute intermittent porphyria', is_correct: true },
        { label: 'C', text: 'Lead poisoning', is_correct: false },
        { label: 'D', text: 'Hereditary coproporphyria', is_correct: false },
        { label: 'E', text: 'Gilbert syndrome', is_correct: false },
      ],
      explanation: 'Acute intermittent porphyria (AIP) is caused by deficiency of porphobilinogen deaminase (also known as hydroxymethylbilane synthase), the third enzyme in the heme synthesis pathway. It presents with the classic triad of abdominal pain, neuropsychiatric symptoms, and autonomic dysfunction. The markedly elevated urine PBG is the diagnostic hallmark. Precipitants include drugs (especially P450 inducers like OCPs, barbiturates), fasting, and hormonal changes. Hyponatremia results from SIADH. Porphyria cutanea tarda (A) causes photosensitive skin lesions, not acute attacks. Lead poisoning (C) elevates ALA but not PBG. Gilbert syndrome (E) involves unconjugated hyperbilirubinemia.',
    },
  },
  // IMG — Image-Based
  {
    item_type: 'IMG',
    quality_score: 0.92,
    content: {
      stem: 'A 55-year-old man undergoes upper endoscopy for evaluation of dysphagia and chronic heartburn. Biopsy of the distal esophagus reveals replacement of the normal stratified squamous epithelium with columnar epithelium containing goblet cells.',
      lead_in: 'Which of the following best describes this histological finding?',
      options: [
        { label: 'A', text: 'Squamous cell carcinoma in situ', is_correct: false },
        { label: 'B', text: 'Intestinal metaplasia (Barrett esophagus)', is_correct: true },
        { label: 'C', text: 'Gastric heterotopia', is_correct: false },
        { label: 'D', text: 'High-grade dysplasia', is_correct: false },
        { label: 'E', text: 'Eosinophilic esophagitis', is_correct: false },
      ],
      explanation: 'The replacement of normal esophageal stratified squamous epithelium with intestinal-type columnar epithelium containing goblet cells defines Barrett esophagus, a metaplastic change resulting from chronic gastroesophageal reflux (GERD). This is a premalignant condition with increased risk for esophageal adenocarcinoma. The key diagnostic feature is the presence of goblet cells (intestinal metaplasia), which distinguishes Barrett from simple columnar metaplasia. Gastric heterotopia (C) contains gastric-type columnar epithelium without goblet cells. Eosinophilic esophagitis (E) shows eosinophilic infiltration of squamous epithelium.',
    },
  },
  // ACUTE — Acute Management
  {
    item_type: 'ACUTE',
    quality_score: 0.96,
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
      explanation: 'This patient presents with the classic findings of tension pneumothorax: hypotension, tachycardia, absent breath sounds on the affected side, tracheal deviation away from the affected side, and distended neck veins. Tension pneumothorax is a clinical diagnosis that requires immediate needle decompression (large-bore needle in the 2nd intercostal space, midclavicular line) before obtaining imaging. This is a life-threatening emergency where delay for imaging (A) can be fatal. Chest tube (D) is the definitive treatment but takes longer to place; needle decompression is the temporizing bridge. Intubation (C) without decompression will worsen the pneumothorax via positive pressure ventilation. IV fluids (E) alone will not correct obstructive shock.',
    },
  },
  // ETH — Ethics/Legal
  {
    item_type: 'ETH',
    quality_score: 0.93,
    content: {
      stem: 'A 78-year-old woman with advanced pancreatic cancer is admitted for pain management. She has decision-making capacity and tells her physician that she does not want CPR or mechanical ventilation if her heart stops. Her adult son, who holds her healthcare power of attorney, disagrees and insists that "everything possible" be done. The patient has not completed a written advance directive.',
      lead_in: 'Which of the following is the most appropriate course of action?',
      options: [
        { label: 'A', text: 'Follow the son\'s wishes as the healthcare proxy', is_correct: false },
        { label: 'B', text: 'Honor the patient\'s expressed wishes', is_correct: true },
        { label: 'C', text: 'Convene an ethics committee before making any decision', is_correct: false },
        { label: 'D', text: 'Obtain a court order to resolve the disagreement', is_correct: false },
        { label: 'E', text: 'Defer the decision until the patient loses capacity', is_correct: false },
      ],
      explanation: 'The fundamental principle is that a patient with decision-making capacity has the right to make their own medical decisions, including the refusal of life-sustaining treatment. The healthcare power of attorney (proxy) only activates when the patient lacks decision-making capacity. Since this patient currently has capacity and has clearly communicated her preferences, her wishes take precedence over the surrogate\'s. An ethics committee (C) may help mediate the family conflict but is not required before honoring the patient\'s autonomous decision. A court order (D) is unnecessary when the patient has capacity.',
    },
  },
]

async function seedFewShotExamples(): Promise<void> {
  console.log('--- 08-few-shot-examples: Seeding FewShotExample nodes ---')

  const ctx = { institution_id: INSTITUTION_ID }

  for (const fse of FEW_SHOT_EXAMPLES) {
    const contentStr = JSON.stringify(fse.content)

    // MERGE FewShotExample node on item_type + quality_score + institution_id
    const result = await neo4jQuery(
      `MERGE (fse:FewShotExample {
         item_type: $item_type,
         quality_score: $quality_score,
         institution_id: $institution_id
       })
       ON CREATE SET
         fse.uuid = $uuid,
         fse.content = $content,
         fse.created_at = datetime()
       ON MATCH SET
         fse.content = $content,
         fse.updated_at = datetime()
       RETURN fse.uuid AS uuid, fse.item_type AS item_type`,
      {
        uuid: randomUUID(),
        item_type: fse.item_type,
        quality_score: fse.quality_score,
        content: contentStr,
      },
      ctx
    )

    if (result) {
      const record = result.records[0]
      console.log(`  ✓ FewShotExample (${record?.item_type ?? fse.item_type})`)
    } else {
      console.error(`  ✗ Failed to seed FewShotExample (${fse.item_type}) — Neo4j unavailable`)
    }

    // Create EXEMPLIFIES edge to matching TaskShell
    const edgeResult = await neo4jQuery(
      `MATCH (fse:FewShotExample {item_type: $item_type, institution_id: $institution_id})
       MATCH (ts:TaskShell {item_type: $item_type, institution_id: $institution_id})
       MERGE (fse)-[:EXEMPLIFIES]->(ts)
       RETURN fse.item_type AS item_type, ts.name AS task_shell_name`,
      {
        item_type: fse.item_type,
      },
      ctx
    )

    if (edgeResult && edgeResult.records.length > 0) {
      console.log(`    → EXEMPLIFIES → ${edgeResult.records[0]?.task_shell_name}`)
    } else {
      console.warn(`    ⚠ Could not link to TaskShell (${fse.item_type}) — run 03-task-shells first`)
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
