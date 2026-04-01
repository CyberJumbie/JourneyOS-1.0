/**
 * scripts/seeds/05-usmle-taxonomy.ts — USMLE Step 1 Taxonomy Seed
 *
 * Seeds the ASSESSMENT HUB of the Three-Hub Invariant (D06):
 *   USMLE_System (18) → USMLE_Topic (~100) → USMLE_Subtopic (~400)
 *
 * Idempotent: uses MERGE on {code, institution_id} composite key.
 * Order: systems → topics + HAS_TOPIC → subtopics + HAS_SUBTOPIC
 *
 * Usage: pnpm tsx scripts/seeds/05-usmle-taxonomy.ts
 */

import { neo4jQuery } from '../../packages/neo4j/client'
import { randomUUID } from 'node:crypto'

// ---------------------------------------------------------------------------
// Institution context
// ---------------------------------------------------------------------------
const institutionId = process.env.INSTITUTION_ID ?? 'msm-default'
const ctx = { institution_id: institutionId }

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------
interface SystemDef {
  code: string
  name: string
}

interface TopicDef {
  code: string
  name: string
  systemCode: string
  subtopics: SubtopicDef[]
}

interface SubtopicDef {
  code: string
  name: string
}

// ---------------------------------------------------------------------------
// USMLE Systems (18)
// ---------------------------------------------------------------------------
const SYSTEMS: SystemDef[] = [
  { code: 'CVS', name: 'Cardiovascular' },
  { code: 'RESP', name: 'Respiratory' },
  { code: 'RENAL', name: 'Renal/Urinary' },
  { code: 'GI', name: 'Gastrointestinal' },
  { code: 'REPRO', name: 'Reproductive' },
  { code: 'ENDO', name: 'Endocrine' },
  { code: 'NERV', name: 'Nervous/Special Senses' },
  { code: 'MSK', name: 'Musculoskeletal/Skin/Connective Tissue' },
  { code: 'HEM', name: 'Hematologic/Lymphoreticular' },
  { code: 'BEH', name: 'Behavioral/Emotional' },
  { code: 'IMMUN', name: 'Immune' },
  { code: 'MULTI', name: 'Multisystem Processes' },
  { code: 'BIOSTATS', name: 'Biostatistics/Epidemiology' },
  { code: 'PHARM', name: 'Pharmacology' },
  { code: 'BIOCHEM', name: 'Biochemistry/Molecular Biology' },
  { code: 'MICRO', name: 'Microbiology' },
  { code: 'PATH', name: 'Pathology' },
  { code: 'GEN', name: 'Genetics' },
]

// ---------------------------------------------------------------------------
// Helper to build subtopic codes: SYSTEM-TOPIC-001, -002, etc.
// ---------------------------------------------------------------------------
function buildSubtopics(
  topicCode: string,
  names: string[]
): SubtopicDef[] {
  return names.map((name, i) => ({
    code: `${topicCode}-${String(i + 1).padStart(3, '0')}`,
    name,
  }))
}

// ---------------------------------------------------------------------------
// USMLE Topics and Subtopics — full taxonomy
// ---------------------------------------------------------------------------
const TOPICS: TopicDef[] = [
  // ── CVS (6 topics, ~28 subtopics) ──
  {
    code: 'CVS-ANAT', name: 'Cardiac Anatomy', systemCode: 'CVS',
    subtopics: buildSubtopics('CVS-ANAT', [
      'Heart Chambers and Valves', 'Coronary Artery Anatomy', 'Cardiac Conduction System',
      'Pericardium', 'Fetal Circulation',
    ]),
  },
  {
    code: 'CVS-PHYS', name: 'Cardiac Physiology', systemCode: 'CVS',
    subtopics: buildSubtopics('CVS-PHYS', [
      'Cardiac Cycle and Pressure-Volume Loops', 'Starling Mechanism', 'Cardiac Output Regulation',
      'Baroreceptor Reflexes', 'Electrocardiogram Basics',
    ]),
  },
  {
    code: 'CVS-PATH', name: 'Cardiac Pathology', systemCode: 'CVS',
    subtopics: buildSubtopics('CVS-PATH', [
      'Ischemic Heart Disease', 'Valvular Heart Disease', 'Cardiomyopathies',
      'Congenital Heart Defects', 'Heart Failure',
    ]),
  },
  {
    code: 'CVS-PHRM', name: 'Cardiac Pharmacology', systemCode: 'CVS',
    subtopics: buildSubtopics('CVS-PHRM', [
      'Antiarrhythmics', 'Antianginals', 'Heart Failure Drugs',
      'Antihypertensives', 'Anticoagulants and Antiplatelets',
    ]),
  },
  {
    code: 'CVS-VASC', name: 'Vascular Pathology', systemCode: 'CVS',
    subtopics: buildSubtopics('CVS-VASC', [
      'Atherosclerosis', 'Aortic Aneurysm and Dissection', 'Vasculitides',
      'Venous Thromboembolism', 'Peripheral Artery Disease',
    ]),
  },
  {
    code: 'CVS-ECG', name: 'ECG Interpretation', systemCode: 'CVS',
    subtopics: buildSubtopics('CVS-ECG', [
      'Normal ECG and Intervals', 'Arrhythmia Recognition', 'ST-Segment Changes',
    ]),
  },

  // ── RESP (6 topics, ~27 subtopics) ──
  {
    code: 'RESP-ANAT', name: 'Pulmonary Anatomy', systemCode: 'RESP',
    subtopics: buildSubtopics('RESP-ANAT', [
      'Airway Anatomy', 'Lung Lobes and Segments', 'Pleura and Mediastinum',
      'Diaphragm and Muscles of Respiration',
    ]),
  },
  {
    code: 'RESP-PHYS', name: 'Respiratory Physiology', systemCode: 'RESP',
    subtopics: buildSubtopics('RESP-PHYS', [
      'Lung Volumes and Capacities', 'Gas Exchange and Diffusion', 'Oxygen-Hemoglobin Dissociation',
      'Ventilation-Perfusion Matching', 'Respiratory Control Centers',
    ]),
  },
  {
    code: 'RESP-OBST', name: 'Obstructive Lung Disease', systemCode: 'RESP',
    subtopics: buildSubtopics('RESP-OBST', [
      'Asthma', 'COPD/Emphysema', 'Bronchiectasis', 'Cystic Fibrosis',
    ]),
  },
  {
    code: 'RESP-REST', name: 'Restrictive Lung Disease', systemCode: 'RESP',
    subtopics: buildSubtopics('RESP-REST', [
      'Idiopathic Pulmonary Fibrosis', 'Sarcoidosis', 'Pneumoconioses',
      'Acute Respiratory Distress Syndrome',
    ]),
  },
  {
    code: 'RESP-INF', name: 'Pulmonary Infections', systemCode: 'RESP',
    subtopics: buildSubtopics('RESP-INF', [
      'Community-Acquired Pneumonia', 'Hospital-Acquired Pneumonia', 'Tuberculosis',
      'Lung Abscess', 'Fungal Pulmonary Infections',
    ]),
  },
  {
    code: 'RESP-PHRM', name: 'Pulmonary Pharmacology', systemCode: 'RESP',
    subtopics: buildSubtopics('RESP-PHRM', [
      'Bronchodilators', 'Inhaled Corticosteroids', 'Leukotriene Modifiers',
      'Antitussives and Mucolytics', 'Pulmonary Vasodilators',
    ]),
  },

  // ── RENAL (5 topics, ~23 subtopics) ──
  {
    code: 'RENAL-ANAT', name: 'Renal Anatomy', systemCode: 'RENAL',
    subtopics: buildSubtopics('RENAL-ANAT', [
      'Nephron Structure', 'Renal Vasculature', 'Glomerular Anatomy',
      'Collecting Duct System',
    ]),
  },
  {
    code: 'RENAL-PHYS', name: 'Renal Physiology', systemCode: 'RENAL',
    subtopics: buildSubtopics('RENAL-PHYS', [
      'Glomerular Filtration', 'Tubular Reabsorption and Secretion',
      'Countercurrent Multiplier', 'Acid-Base Regulation', 'Renin-Angiotensin-Aldosterone System',
    ]),
  },
  {
    code: 'RENAL-PATH', name: 'Renal Pathology', systemCode: 'RENAL',
    subtopics: buildSubtopics('RENAL-PATH', [
      'Glomerulonephritis', 'Nephrotic Syndrome', 'Nephritic Syndrome',
      'Acute Kidney Injury', 'Chronic Kidney Disease',
    ]),
  },
  {
    code: 'RENAL-FLUID', name: 'Fluid and Electrolytes', systemCode: 'RENAL',
    subtopics: buildSubtopics('RENAL-FLUID', [
      'Sodium Disorders', 'Potassium Disorders', 'Calcium and Phosphate Homeostasis',
      'Metabolic Acidosis and Alkalosis',
    ]),
  },
  {
    code: 'RENAL-PHRM', name: 'Renal Pharmacology', systemCode: 'RENAL',
    subtopics: buildSubtopics('RENAL-PHRM', [
      'Diuretics', 'ACE Inhibitors and ARBs', 'Dialysis Principles',
      'Nephrotoxic Drugs',
    ]),
  },

  // ── GI (6 topics, ~28 subtopics) ──
  {
    code: 'GI-ANAT', name: 'GI Anatomy', systemCode: 'GI',
    subtopics: buildSubtopics('GI-ANAT', [
      'Esophagus and Stomach Anatomy', 'Small Intestine and Colon Anatomy',
      'Hepatobiliary Anatomy', 'Pancreatic Anatomy',
    ]),
  },
  {
    code: 'GI-PHYS', name: 'GI Physiology', systemCode: 'GI',
    subtopics: buildSubtopics('GI-PHYS', [
      'GI Motility', 'Gastric Acid Secretion', 'Bile Formation and Secretion',
      'Nutrient Absorption', 'Pancreatic Exocrine Function',
    ]),
  },
  {
    code: 'GI-PATH', name: 'GI Pathology', systemCode: 'GI',
    subtopics: buildSubtopics('GI-PATH', [
      'GERD and Esophageal Disorders', 'Peptic Ulcer Disease', 'Inflammatory Bowel Disease',
      'Colorectal Cancer', 'Celiac Disease',
    ]),
  },
  {
    code: 'GI-LIVER', name: 'Hepatobiliary Pathology', systemCode: 'GI',
    subtopics: buildSubtopics('GI-LIVER', [
      'Hepatitis', 'Cirrhosis', 'Hepatocellular Carcinoma',
      'Cholelithiasis and Cholecystitis', 'Pancreatitis',
    ]),
  },
  {
    code: 'GI-PHRM', name: 'GI Pharmacology', systemCode: 'GI',
    subtopics: buildSubtopics('GI-PHRM', [
      'Proton Pump Inhibitors and H2 Blockers', 'Antiemetics', 'Laxatives',
      'Antidiarrheals', 'Hepatitis Antivirals',
    ]),
  },
  {
    code: 'GI-NUTR', name: 'Nutrition', systemCode: 'GI',
    subtopics: buildSubtopics('GI-NUTR', [
      'Vitamin Deficiencies', 'Mineral Deficiencies', 'Malabsorption Syndromes',
    ]),
  },

  // ── REPRO (6 topics, ~27 subtopics) ──
  {
    code: 'REPRO-MANAT', name: 'Male Reproductive Anatomy', systemCode: 'REPRO',
    subtopics: buildSubtopics('REPRO-MANAT', [
      'Testicular Anatomy', 'Prostate Anatomy', 'Spermatogenesis',
    ]),
  },
  {
    code: 'REPRO-FANAT', name: 'Female Reproductive Anatomy', systemCode: 'REPRO',
    subtopics: buildSubtopics('REPRO-FANAT', [
      'Ovarian Anatomy', 'Uterine Anatomy', 'Oogenesis and Folliculogenesis',
      'Menstrual Cycle Physiology',
    ]),
  },
  {
    code: 'REPRO-OB', name: 'Obstetrics', systemCode: 'REPRO',
    subtopics: buildSubtopics('REPRO-OB', [
      'Embryology and Placental Development', 'Normal Pregnancy Physiology',
      'Pregnancy Complications', 'Labor and Delivery', 'Teratology',
    ]),
  },
  {
    code: 'REPRO-MPATH', name: 'Male Reproductive Pathology', systemCode: 'REPRO',
    subtopics: buildSubtopics('REPRO-MPATH', [
      'Benign Prostatic Hyperplasia', 'Prostate Cancer', 'Testicular Tumors',
      'Erectile Dysfunction',
    ]),
  },
  {
    code: 'REPRO-FPATH', name: 'Female Reproductive Pathology', systemCode: 'REPRO',
    subtopics: buildSubtopics('REPRO-FPATH', [
      'Cervical Cancer', 'Endometrial Cancer', 'Ovarian Tumors',
      'Endometriosis', 'Polycystic Ovary Syndrome',
    ]),
  },
  {
    code: 'REPRO-PHRM', name: 'Reproductive Pharmacology', systemCode: 'REPRO',
    subtopics: buildSubtopics('REPRO-PHRM', [
      'Oral Contraceptives', 'Hormone Replacement Therapy', 'Tocolytics and Oxytocics',
      'Fertility Drugs', 'Androgens and Antiandrogens',
    ]),
  },

  // ── ENDO (5 topics, ~24 subtopics) ──
  {
    code: 'ENDO-HYPO', name: 'Hypothalamic-Pituitary Axis', systemCode: 'ENDO',
    subtopics: buildSubtopics('ENDO-HYPO', [
      'Anterior Pituitary Hormones', 'Posterior Pituitary Hormones',
      'Hypothalamic Releasing Hormones', 'Pituitary Adenomas',
    ]),
  },
  {
    code: 'ENDO-THYR', name: 'Thyroid Disorders', systemCode: 'ENDO',
    subtopics: buildSubtopics('ENDO-THYR', [
      'Thyroid Hormone Synthesis', 'Hyperthyroidism', 'Hypothyroidism',
      'Thyroid Cancer', 'Thyroiditis',
    ]),
  },
  {
    code: 'ENDO-ADRE', name: 'Adrenal Disorders', systemCode: 'ENDO',
    subtopics: buildSubtopics('ENDO-ADRE', [
      'Cushing Syndrome', 'Addison Disease', 'Pheochromocytoma',
      'Congenital Adrenal Hyperplasia', 'Hyperaldosteronism',
    ]),
  },
  {
    code: 'ENDO-DM', name: 'Diabetes and Pancreatic Endocrinology', systemCode: 'ENDO',
    subtopics: buildSubtopics('ENDO-DM', [
      'Type 1 Diabetes', 'Type 2 Diabetes', 'Diabetic Ketoacidosis',
      'Hypoglycemia', 'Insulinoma',
    ]),
  },
  {
    code: 'ENDO-PHRM', name: 'Endocrine Pharmacology', systemCode: 'ENDO',
    subtopics: buildSubtopics('ENDO-PHRM', [
      'Insulin and Oral Hypoglycemics', 'Thyroid Drugs', 'Corticosteroids',
      'Growth Hormone Analogs', 'Antithyroid Drugs',
    ]),
  },

  // ── NERV (7 topics, ~33 subtopics) ──
  {
    code: 'NERV-ANAT', name: 'Neuroanatomy', systemCode: 'NERV',
    subtopics: buildSubtopics('NERV-ANAT', [
      'Cerebral Cortex Localization', 'Brainstem Anatomy', 'Spinal Cord Tracts',
      'Cranial Nerves', 'Circle of Willis',
    ]),
  },
  {
    code: 'NERV-PHYS', name: 'Neurophysiology', systemCode: 'NERV',
    subtopics: buildSubtopics('NERV-PHYS', [
      'Action Potential Physiology', 'Neurotransmitter Systems',
      'Synaptic Transmission', 'Autonomic Nervous System', 'Neuromuscular Junction',
    ]),
  },
  {
    code: 'NERV-PATH', name: 'Neuropathology', systemCode: 'NERV',
    subtopics: buildSubtopics('NERV-PATH', [
      'Stroke Syndromes', 'Demyelinating Diseases', 'Neurodegenerative Diseases',
      'CNS Tumors', 'Meningitis and Encephalitis',
    ]),
  },
  {
    code: 'NERV-PHRM', name: 'Neuropharmacology', systemCode: 'NERV',
    subtopics: buildSubtopics('NERV-PHRM', [
      'Anesthetics', 'Antiepileptics', 'Parkinson Disease Drugs',
      'Opioid Analgesics', 'Neuromuscular Blockers',
    ]),
  },
  {
    code: 'NERV-EYE', name: 'Ophthalmology', systemCode: 'NERV',
    subtopics: buildSubtopics('NERV-EYE', [
      'Glaucoma', 'Retinal Disorders', 'Visual Pathway Lesions',
      'Pupillary Reflexes',
    ]),
  },
  {
    code: 'NERV-ENT', name: 'Otolaryngology', systemCode: 'NERV',
    subtopics: buildSubtopics('NERV-ENT', [
      'Hearing Loss Types', 'Vestibular Disorders', 'Otitis Media',
    ]),
  },
  {
    code: 'NERV-PNS', name: 'Peripheral Neuropathies', systemCode: 'NERV',
    subtopics: buildSubtopics('NERV-PNS', [
      'Guillain-Barre Syndrome', 'Diabetic Neuropathy', 'Carpal Tunnel Syndrome',
      'Myasthenia Gravis',
    ]),
  },

  // ── MSK (5 topics, ~23 subtopics) ──
  {
    code: 'MSK-ANAT', name: 'Musculoskeletal Anatomy', systemCode: 'MSK',
    subtopics: buildSubtopics('MSK-ANAT', [
      'Upper Extremity Anatomy', 'Lower Extremity Anatomy', 'Spine Anatomy',
      'Joint Structure and Classification',
    ]),
  },
  {
    code: 'MSK-PATH', name: 'Musculoskeletal Pathology', systemCode: 'MSK',
    subtopics: buildSubtopics('MSK-PATH', [
      'Osteoarthritis', 'Rheumatoid Arthritis', 'Gout and Pseudogout',
      'Osteoporosis', 'Bone Tumors', 'Fracture Healing',
    ]),
  },
  {
    code: 'MSK-DERM', name: 'Dermatology', systemCode: 'MSK',
    subtopics: buildSubtopics('MSK-DERM', [
      'Inflammatory Skin Conditions', 'Skin Cancer', 'Blistering Diseases',
      'Pigmentation Disorders', 'Infectious Skin Diseases',
    ]),
  },
  {
    code: 'MSK-CT', name: 'Connective Tissue Disorders', systemCode: 'MSK',
    subtopics: buildSubtopics('MSK-CT', [
      'Systemic Lupus Erythematosus', 'Scleroderma', 'Marfan Syndrome',
      'Ehlers-Danlos Syndrome',
    ]),
  },
  {
    code: 'MSK-PHRM', name: 'Musculoskeletal Pharmacology', systemCode: 'MSK',
    subtopics: buildSubtopics('MSK-PHRM', [
      'NSAIDs', 'DMARDs', 'Gout Drugs', 'Muscle Relaxants',
    ]),
  },

  // ── HEM (5 topics, ~24 subtopics) ──
  {
    code: 'HEM-RBC', name: 'Red Blood Cell Disorders', systemCode: 'HEM',
    subtopics: buildSubtopics('HEM-RBC', [
      'Iron Deficiency Anemia', 'Megaloblastic Anemia', 'Sickle Cell Disease',
      'Thalassemias', 'Hemolytic Anemias',
    ]),
  },
  {
    code: 'HEM-WBC', name: 'White Blood Cell Disorders', systemCode: 'HEM',
    subtopics: buildSubtopics('HEM-WBC', [
      'Leukemias', 'Lymphomas', 'Myeloproliferative Disorders',
      'Plasma Cell Neoplasms', 'Leukocytosis and Leukopenia',
    ]),
  },
  {
    code: 'HEM-COAG', name: 'Coagulation Disorders', systemCode: 'HEM',
    subtopics: buildSubtopics('HEM-COAG', [
      'Coagulation Cascade', 'Hemophilias', 'Von Willebrand Disease',
      'DIC', 'Thrombocytopenia',
    ]),
  },
  {
    code: 'HEM-TRANS', name: 'Transfusion Medicine', systemCode: 'HEM',
    subtopics: buildSubtopics('HEM-TRANS', [
      'Blood Typing and Crossmatching', 'Transfusion Reactions',
      'Component Therapy',
    ]),
  },
  {
    code: 'HEM-LYMPH', name: 'Lymphoreticular System', systemCode: 'HEM',
    subtopics: buildSubtopics('HEM-LYMPH', [
      'Spleen Pathology', 'Lymph Node Pathology', 'Thymus Pathology',
      'Langerhans Cell Histiocytosis', 'Lymphedema',
    ]),
  },

  // ── BEH (5 topics, ~22 subtopics) ──
  {
    code: 'BEH-DEV', name: 'Human Development', systemCode: 'BEH',
    subtopics: buildSubtopics('BEH-DEV', [
      'Cognitive Development Theories', 'Psychosocial Development',
      'Language Development', 'Attachment Theory',
    ]),
  },
  {
    code: 'BEH-PSYCH', name: 'Psychiatric Disorders', systemCode: 'BEH',
    subtopics: buildSubtopics('BEH-PSYCH', [
      'Mood Disorders', 'Anxiety Disorders', 'Psychotic Disorders',
      'Personality Disorders', 'Substance Use Disorders', 'Eating Disorders',
    ]),
  },
  {
    code: 'BEH-PHRM', name: 'Psychopharmacology', systemCode: 'BEH',
    subtopics: buildSubtopics('BEH-PHRM', [
      'Antidepressants', 'Antipsychotics', 'Anxiolytics and Sedatives',
      'Mood Stabilizers', 'Stimulants',
    ]),
  },
  {
    code: 'BEH-ETHC', name: 'Ethics and Legal Issues', systemCode: 'BEH',
    subtopics: buildSubtopics('BEH-ETHC', [
      'Informed Consent', 'Advance Directives', 'Medical Malpractice',
      'Confidentiality and HIPAA',
    ]),
  },
  {
    code: 'BEH-COMM', name: 'Communication and Patient Care', systemCode: 'BEH',
    subtopics: buildSubtopics('BEH-COMM', [
      'Breaking Bad News', 'Motivational Interviewing', 'Cultural Competence',
    ]),
  },

  // ── IMMUN (5 topics, ~23 subtopics) ──
  {
    code: 'IMMUN-INN', name: 'Innate Immunity', systemCode: 'IMMUN',
    subtopics: buildSubtopics('IMMUN-INN', [
      'Complement System', 'Toll-Like Receptors', 'Phagocytic Cells',
      'Acute Phase Reactants', 'Inflammation Mediators',
    ]),
  },
  {
    code: 'IMMUN-ADAP', name: 'Adaptive Immunity', systemCode: 'IMMUN',
    subtopics: buildSubtopics('IMMUN-ADAP', [
      'T Cell Development and Activation', 'B Cell Development and Antibodies',
      'MHC and Antigen Presentation', 'Immunoglobulin Classes',
    ]),
  },
  {
    code: 'IMMUN-HYPR', name: 'Hypersensitivity Reactions', systemCode: 'IMMUN',
    subtopics: buildSubtopics('IMMUN-HYPR', [
      'Type I Hypersensitivity', 'Type II Hypersensitivity',
      'Type III Hypersensitivity', 'Type IV Hypersensitivity',
    ]),
  },
  {
    code: 'IMMUN-IDEF', name: 'Immunodeficiency Disorders', systemCode: 'IMMUN',
    subtopics: buildSubtopics('IMMUN-IDEF', [
      'B Cell Deficiencies', 'T Cell Deficiencies', 'Combined Immunodeficiencies',
      'Phagocyte Deficiencies', 'HIV/AIDS',
    ]),
  },
  {
    code: 'IMMUN-PHRM', name: 'Immunopharmacology', systemCode: 'IMMUN',
    subtopics: buildSubtopics('IMMUN-PHRM', [
      'Immunosuppressants', 'Vaccines', 'Monoclonal Antibodies',
      'Cytokine Therapy', 'Antihistamines',
    ]),
  },

  // ── MULTI (5 topics, ~22 subtopics) ──
  {
    code: 'MULTI-NEO', name: 'Neoplasia', systemCode: 'MULTI',
    subtopics: buildSubtopics('MULTI-NEO', [
      'Tumor Biology', 'Oncogenes and Tumor Suppressors', 'Paraneoplastic Syndromes',
      'Cancer Screening', 'Tumor Markers',
    ]),
  },
  {
    code: 'MULTI-INF', name: 'Systemic Infections', systemCode: 'MULTI',
    subtopics: buildSubtopics('MULTI-INF', [
      'Sepsis and SIRS', 'Nosocomial Infections', 'Opportunistic Infections',
      'Bioterrorism Agents',
    ]),
  },
  {
    code: 'MULTI-NUTR', name: 'Nutritional Disorders', systemCode: 'MULTI',
    subtopics: buildSubtopics('MULTI-NUTR', [
      'Protein-Energy Malnutrition', 'Obesity', 'Eating Disorder Complications',
      'Trace Element Deficiencies',
    ]),
  },
  {
    code: 'MULTI-ENV', name: 'Environmental and Occupational Health', systemCode: 'MULTI',
    subtopics: buildSubtopics('MULTI-ENV', [
      'Lead Poisoning', 'Carbon Monoxide Poisoning', 'Radiation Injury',
      'Heat and Cold Injury', 'Drowning',
    ]),
  },
  {
    code: 'MULTI-PEDS', name: 'Pediatric Multisystem', systemCode: 'MULTI',
    subtopics: buildSubtopics('MULTI-PEDS', [
      'Failure to Thrive', 'Child Abuse Recognition', 'Neonatal Screening',
      'Congenital Infections (TORCH)',
    ]),
  },

  // ── BIOSTATS (6 topics, ~24 subtopics) ──
  {
    code: 'BIOSTATS-STUDY', name: 'Study Design', systemCode: 'BIOSTATS',
    subtopics: buildSubtopics('BIOSTATS-STUDY', [
      'Randomized Controlled Trials', 'Cohort Studies', 'Case-Control Studies',
      'Cross-Sectional Studies', 'Meta-Analysis and Systematic Reviews',
    ]),
  },
  {
    code: 'BIOSTATS-MEAS', name: 'Measures of Disease', systemCode: 'BIOSTATS',
    subtopics: buildSubtopics('BIOSTATS-MEAS', [
      'Incidence and Prevalence', 'Relative Risk and Odds Ratio',
      'Attributable Risk', 'Number Needed to Treat',
    ]),
  },
  {
    code: 'BIOSTATS-TEST', name: 'Diagnostic Testing', systemCode: 'BIOSTATS',
    subtopics: buildSubtopics('BIOSTATS-TEST', [
      'Sensitivity and Specificity', 'Positive and Negative Predictive Values',
      'ROC Curves', 'Likelihood Ratios',
    ]),
  },
  {
    code: 'BIOSTATS-STAT', name: 'Statistical Analysis', systemCode: 'BIOSTATS',
    subtopics: buildSubtopics('BIOSTATS-STAT', [
      'p-Values and Confidence Intervals', 'Type I and Type II Errors',
      'Power Analysis', 'Chi-Square and t-Tests',
    ]),
  },
  {
    code: 'BIOSTATS-BIAS', name: 'Bias and Confounding', systemCode: 'BIOSTATS',
    subtopics: buildSubtopics('BIOSTATS-BIAS', [
      'Selection Bias', 'Information Bias', 'Confounding Variables',
      'Methods to Reduce Bias',
    ]),
  },
  {
    code: 'BIOSTATS-PREV', name: 'Preventive Medicine', systemCode: 'BIOSTATS',
    subtopics: buildSubtopics('BIOSTATS-PREV', [
      'Levels of Prevention', 'Screening Guidelines', 'Immunization Schedules',
    ]),
  },

  // ── PHARM (6 topics, ~26 subtopics) ──
  {
    code: 'PHARM-PK', name: 'Pharmacokinetics', systemCode: 'PHARM',
    subtopics: buildSubtopics('PHARM-PK', [
      'Absorption and Bioavailability', 'Volume of Distribution',
      'Drug Metabolism (Phase I and II)', 'Renal Clearance', 'Half-Life and Steady State',
    ]),
  },
  {
    code: 'PHARM-PD', name: 'Pharmacodynamics', systemCode: 'PHARM',
    subtopics: buildSubtopics('PHARM-PD', [
      'Dose-Response Curves', 'Agonists and Antagonists', 'Receptor Types',
      'Therapeutic Index',
    ]),
  },
  {
    code: 'PHARM-ANS', name: 'Autonomic Pharmacology', systemCode: 'PHARM',
    subtopics: buildSubtopics('PHARM-ANS', [
      'Cholinergic Agonists and Antagonists', 'Adrenergic Agonists',
      'Alpha and Beta Blockers', 'Ganglionic Blockers',
    ]),
  },
  {
    code: 'PHARM-ABIO', name: 'Antimicrobials', systemCode: 'PHARM',
    subtopics: buildSubtopics('PHARM-ABIO', [
      'Cell Wall Inhibitors', 'Protein Synthesis Inhibitors',
      'Fluoroquinolones', 'Antifungals', 'Antivirals',
    ]),
  },
  {
    code: 'PHARM-CHEMO', name: 'Antineoplastic Agents', systemCode: 'PHARM',
    subtopics: buildSubtopics('PHARM-CHEMO', [
      'Alkylating Agents', 'Antimetabolites', 'Topoisomerase Inhibitors',
      'Targeted Therapy',
    ]),
  },
  {
    code: 'PHARM-TOX', name: 'Toxicology', systemCode: 'PHARM',
    subtopics: buildSubtopics('PHARM-TOX', [
      'Acetaminophen Toxicity', 'Salicylate Toxicity', 'Drug Overdose Management',
    ]),
  },

  // ── BIOCHEM (6 topics, ~27 subtopics) ──
  {
    code: 'BIOCHEM-MET', name: 'Metabolism', systemCode: 'BIOCHEM',
    subtopics: buildSubtopics('BIOCHEM-MET', [
      'Glycolysis and Gluconeogenesis', 'TCA Cycle', 'Oxidative Phosphorylation',
      'Fatty Acid Synthesis and Oxidation', 'Amino Acid Metabolism',
    ]),
  },
  {
    code: 'BIOCHEM-MOL', name: 'Molecular Biology', systemCode: 'BIOCHEM',
    subtopics: buildSubtopics('BIOCHEM-MOL', [
      'DNA Replication', 'Transcription', 'Translation',
      'DNA Repair Mechanisms', 'Gene Regulation',
    ]),
  },
  {
    code: 'BIOCHEM-VIT', name: 'Vitamins and Cofactors', systemCode: 'BIOCHEM',
    subtopics: buildSubtopics('BIOCHEM-VIT', [
      'Water-Soluble Vitamins', 'Fat-Soluble Vitamins', 'Cofactor Functions',
    ]),
  },
  {
    code: 'BIOCHEM-STRG', name: 'Storage Diseases', systemCode: 'BIOCHEM',
    subtopics: buildSubtopics('BIOCHEM-STRG', [
      'Glycogen Storage Diseases', 'Lysosomal Storage Diseases',
      'Sphingolipidoses', 'Mucopolysaccharidoses',
    ]),
  },
  {
    code: 'BIOCHEM-AA', name: 'Amino Acid Disorders', systemCode: 'BIOCHEM',
    subtopics: buildSubtopics('BIOCHEM-AA', [
      'Phenylketonuria', 'Maple Syrup Urine Disease', 'Homocystinuria',
      'Alkaptonuria',
    ]),
  },
  {
    code: 'BIOCHEM-TECH', name: 'Laboratory Techniques', systemCode: 'BIOCHEM',
    subtopics: buildSubtopics('BIOCHEM-TECH', [
      'PCR and Gel Electrophoresis', 'Blotting Techniques',
      'ELISA and Immunoassays', 'Flow Cytometry', 'CRISPR',
    ]),
  },

  // ── MICRO (7 topics, ~33 subtopics) ──
  {
    code: 'MICRO-BACT', name: 'Bacteriology', systemCode: 'MICRO',
    subtopics: buildSubtopics('MICRO-BACT', [
      'Gram-Positive Cocci', 'Gram-Negative Rods', 'Mycobacteria',
      'Spirochetes', 'Atypical Bacteria',
    ]),
  },
  {
    code: 'MICRO-VIR', name: 'Virology', systemCode: 'MICRO',
    subtopics: buildSubtopics('MICRO-VIR', [
      'DNA Viruses', 'RNA Viruses', 'Retroviruses',
      'Hepatitis Viruses', 'Herpesviruses',
    ]),
  },
  {
    code: 'MICRO-FUNG', name: 'Mycology', systemCode: 'MICRO',
    subtopics: buildSubtopics('MICRO-FUNG', [
      'Systemic Mycoses', 'Opportunistic Mycoses', 'Cutaneous Mycoses',
    ]),
  },
  {
    code: 'MICRO-PARA', name: 'Parasitology', systemCode: 'MICRO',
    subtopics: buildSubtopics('MICRO-PARA', [
      'Protozoa', 'Helminths', 'Ectoparasites', 'Malaria',
    ]),
  },
  {
    code: 'MICRO-MECH', name: 'Antimicrobial Mechanisms', systemCode: 'MICRO',
    subtopics: buildSubtopics('MICRO-MECH', [
      'Mechanisms of Antibiotic Resistance', 'Bacterial Virulence Factors',
      'Biofilm Formation', 'Antimicrobial Stewardship',
    ]),
  },
  {
    code: 'MICRO-LAB', name: 'Microbiology Lab Techniques', systemCode: 'MICRO',
    subtopics: buildSubtopics('MICRO-LAB', [
      'Gram Stain', 'Culture Media', 'Serologic Testing',
      'Molecular Diagnostics',
    ]),
  },
  {
    code: 'MICRO-INFCONT', name: 'Infection Control', systemCode: 'MICRO',
    subtopics: buildSubtopics('MICRO-INFCONT', [
      'Sterilization and Disinfection', 'Universal Precautions',
      'Notifiable Diseases',
    ]),
  },

  // ── PATH (6 topics, ~27 subtopics) ──
  {
    code: 'PATH-CELL', name: 'Cell Injury and Death', systemCode: 'PATH',
    subtopics: buildSubtopics('PATH-CELL', [
      'Apoptosis vs Necrosis', 'Free Radical Injury', 'Cellular Adaptations',
      'Intracellular Accumulations', 'Calcification',
    ]),
  },
  {
    code: 'PATH-INFL', name: 'Inflammation', systemCode: 'PATH',
    subtopics: buildSubtopics('PATH-INFL', [
      'Acute Inflammation', 'Chronic Inflammation', 'Granulomatous Inflammation',
      'Wound Healing', 'Fibrosis',
    ]),
  },
  {
    code: 'PATH-HEMO', name: 'Hemodynamic Disorders', systemCode: 'PATH',
    subtopics: buildSubtopics('PATH-HEMO', [
      'Edema', 'Thrombosis and Embolism', 'Infarction',
      'Shock', 'Disseminated Intravascular Coagulation',
    ]),
  },
  {
    code: 'PATH-NEOPL', name: 'Neoplasia Pathology', systemCode: 'PATH',
    subtopics: buildSubtopics('PATH-NEOPL', [
      'Benign vs Malignant Tumors', 'Tumor Grading and Staging',
      'Metastasis Pathways', 'Carcinogenesis',
    ]),
  },
  {
    code: 'PATH-AMY', name: 'Amyloidosis', systemCode: 'PATH',
    subtopics: buildSubtopics('PATH-AMY', [
      'Primary Amyloidosis', 'Secondary Amyloidosis', 'Organ-Specific Amyloid',
    ]),
  },
  {
    code: 'PATH-AUTO', name: 'Autoimmune Pathology', systemCode: 'PATH',
    subtopics: buildSubtopics('PATH-AUTO', [
      'Transplant Rejection', 'Graft-vs-Host Disease', 'Autoimmune Mechanisms',
      'Tolerance and Anergy', 'Immune Complex Deposition',
    ]),
  },

  // ── GEN (5 topics, ~22 subtopics) ──
  {
    code: 'GEN-MEND', name: 'Mendelian Genetics', systemCode: 'GEN',
    subtopics: buildSubtopics('GEN-MEND', [
      'Autosomal Dominant Disorders', 'Autosomal Recessive Disorders',
      'X-Linked Disorders', 'Hardy-Weinberg Equilibrium',
    ]),
  },
  {
    code: 'GEN-CHROM', name: 'Chromosomal Disorders', systemCode: 'GEN',
    subtopics: buildSubtopics('GEN-CHROM', [
      'Down Syndrome', 'Turner Syndrome', 'Klinefelter Syndrome',
      'Chromosomal Deletions and Duplications',
    ]),
  },
  {
    code: 'GEN-NONM', name: 'Non-Mendelian Inheritance', systemCode: 'GEN',
    subtopics: buildSubtopics('GEN-NONM', [
      'Genomic Imprinting', 'Mitochondrial Inheritance', 'Trinucleotide Repeat Disorders',
      'Anticipation',
    ]),
  },
  {
    code: 'GEN-ONCO', name: 'Cancer Genetics', systemCode: 'GEN',
    subtopics: buildSubtopics('GEN-ONCO', [
      'Tumor Suppressor Genes', 'Proto-Oncogenes', 'Familial Cancer Syndromes',
      'Chromosomal Translocations',
    ]),
  },
  {
    code: 'GEN-TECH', name: 'Genetic Testing and Counseling', systemCode: 'GEN',
    subtopics: buildSubtopics('GEN-TECH', [
      'Karyotyping', 'Prenatal Diagnostic Methods', 'Newborn Screening',
      'Genetic Counseling Principles', 'Pharmacogenomics',
    ]),
  },
]

// ---------------------------------------------------------------------------
// Seeding functions
// ---------------------------------------------------------------------------

async function seedSystems(): Promise<void> {
  console.log(`\n[seed] Seeding ${SYSTEMS.length} USMLE_System nodes...`)

  for (const sys of SYSTEMS) {
    await neo4jQuery(
      `MERGE (s:USMLE_System {code: $code, institution_id: $institution_id})
       ON CREATE SET s.uuid = $uuid, s.name = $name
       ON MATCH  SET s.name = $name`,
      { code: sys.code, name: sys.name, uuid: randomUUID() },
      ctx,
    )
  }

  console.log(`[seed] ✓ ${SYSTEMS.length} USMLE_System nodes seeded`)
}

async function seedTopicsAndSubtopics(): Promise<void> {
  console.log(`\n[seed] Seeding ${TOPICS.length} USMLE_Topic nodes with subtopics...`)

  let subtopicCount = 0

  for (const topic of TOPICS) {
    // MERGE the topic node and create HAS_TOPIC edge from parent system
    await neo4jQuery(
      `MATCH (sys:USMLE_System {code: $systemCode, institution_id: $institution_id})
       MERGE (t:USMLE_Topic {code: $code, institution_id: $institution_id})
       ON CREATE SET t.uuid = $uuid, t.name = $name, t.system_code = $systemCode
       ON MATCH  SET t.name = $name, t.system_code = $systemCode
       MERGE (sys)-[:HAS_TOPIC]->(t)`,
      {
        code: topic.code,
        name: topic.name,
        systemCode: topic.systemCode,
        uuid: randomUUID(),
      },
      ctx,
    )

    // MERGE each subtopic and create HAS_SUBTOPIC edge
    for (const sub of topic.subtopics) {
      await neo4jQuery(
        `MATCH (t:USMLE_Topic {code: $topicCode, institution_id: $institution_id})
         MERGE (st:USMLE_Subtopic {code: $code, institution_id: $institution_id})
         ON CREATE SET st.uuid = $uuid, st.name = $name, st.topic_code = $topicCode
         ON MATCH  SET st.name = $name, st.topic_code = $topicCode
         MERGE (t)-[:HAS_SUBTOPIC]->(st)`,
        {
          code: sub.code,
          name: sub.name,
          topicCode: topic.code,
          uuid: randomUUID(),
        },
        ctx,
      )
      subtopicCount++
    }
  }

  console.log(`[seed] ✓ ${TOPICS.length} USMLE_Topic nodes seeded`)
  console.log(`[seed] ✓ ${subtopicCount} USMLE_Subtopic nodes seeded`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== 05-usmle-taxonomy seed ===')
  console.log(`Institution: ${institutionId}`)

  await seedSystems()
  await seedTopicsAndSubtopics()

  // Print summary counts
  const systemResult = await neo4jQuery<{ count: number }>(
    'MATCH (s:USMLE_System {institution_id: $institution_id}) RETURN count(s) AS count',
    {},
    ctx,
  )
  const topicResult = await neo4jQuery<{ count: number }>(
    'MATCH (t:USMLE_Topic {institution_id: $institution_id}) RETURN count(t) AS count',
    {},
    ctx,
  )
  const subtopicResult = await neo4jQuery<{ count: number }>(
    'MATCH (st:USMLE_Subtopic {institution_id: $institution_id}) RETURN count(st) AS count',
    {},
    ctx,
  )

  console.log('\n=== Seed Summary ===')
  console.log(`USMLE_System nodes:  ${systemResult?.records[0]?.count ?? 'unknown'}`)
  console.log(`USMLE_Topic nodes:   ${topicResult?.records[0]?.count ?? 'unknown'}`)
  console.log(`USMLE_Subtopic nodes: ${subtopicResult?.records[0]?.count ?? 'unknown'}`)
  console.log('=== Done ===\n')
}

main().catch((err) => {
  console.error('[seed] FATAL:', err)
  process.exit(1)
})

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------
export { SYSTEMS, TOPICS, main as seedUsmle }
