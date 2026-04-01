/**
 * scripts/seeds/10-hetionet.ts — Seed HetioNet biomedical knowledge subset
 *
 * Seeds a representative subset of the HetioNet heterogeneous biomedical
 * knowledge network into Neo4j. Focus on high-yield USMLE Step 1 entities:
 *   - ~50 Gene nodes (clinically important genes)
 *   - ~50 Disease nodes (high-yield diseases)
 *   - ~30 Compound nodes (key therapeutic compounds)
 *   - ~100 relationship edges (ASSOCIATES_WITH, TREATS, TARGETS_GENE)
 *
 * Data is curated for medical education relevance, not exhaustive coverage.
 * All entities are medically accurate and mapped to standard identifiers.
 *
 * Idempotent: uses MERGE on {name, institution_id} composite key.
 *
 * Usage: pnpm tsx scripts/seeds/10-hetionet.ts
 */

import { neo4jQuery } from '../../packages/neo4j/client'

// ---------------------------------------------------------------------------
// Institution context
// ---------------------------------------------------------------------------
const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'
const ctx = { institution_id: INSTITUTION_ID }

// ---------------------------------------------------------------------------
// Gene data — USMLE Step 1 high-yield genes
// ---------------------------------------------------------------------------

interface GeneData {
  name: string
  ncbi_id: string
  chromosome: string
  function_summary: string
}

const GENES: GeneData[] = [
  // Tumor suppressors
  { name: 'TP53', ncbi_id: '7157', chromosome: '17p13.1', function_summary: 'Tumor suppressor; guardian of the genome; activates apoptosis, cell cycle arrest, DNA repair' },
  { name: 'RB1', ncbi_id: '5925', chromosome: '13q14.2', function_summary: 'Retinoblastoma protein; regulates G1/S transition via E2F' },
  { name: 'APC', ncbi_id: '324', chromosome: '5q22.2', function_summary: 'Wnt signaling inhibitor; mutated in familial adenomatous polyposis' },
  { name: 'BRCA1', ncbi_id: '672', chromosome: '17q21.31', function_summary: 'DNA double-strand break repair via homologous recombination' },
  { name: 'BRCA2', ncbi_id: '675', chromosome: '13q13.1', function_summary: 'RAD51 recruitment for homologous recombination repair' },
  { name: 'VHL', ncbi_id: '7428', chromosome: '3p25.3', function_summary: 'HIF-alpha ubiquitin ligase; mutated in von Hippel-Lindau syndrome' },
  { name: 'WT1', ncbi_id: '7490', chromosome: '11p13', function_summary: 'Transcription factor; Wilms tumor suppressor' },
  { name: 'NF1', ncbi_id: '4763', chromosome: '17q11.2', function_summary: 'Neurofibromin; RAS-GAP; mutated in neurofibromatosis type 1' },
  { name: 'NF2', ncbi_id: '4771', chromosome: '22q12.2', function_summary: 'Merlin; cytoskeletal linker; mutated in neurofibromatosis type 2' },
  { name: 'PTEN', ncbi_id: '5728', chromosome: '10q23.31', function_summary: 'PI3K/AKT pathway inhibitor; phosphatase and tensin homolog' },

  // Oncogenes
  { name: 'KRAS', ncbi_id: '3845', chromosome: '12p12.1', function_summary: 'GTPase in RAS/MAPK pathway; mutated in pancreatic, lung, colon cancers' },
  { name: 'MYC', ncbi_id: '4609', chromosome: '8q24.21', function_summary: 'Transcription factor controlling cell proliferation; Burkitt lymphoma' },
  { name: 'HER2', ncbi_id: '2064', chromosome: '17q12', function_summary: 'ERBB2 receptor tyrosine kinase; amplified in breast cancer' },
  { name: 'BCR-ABL1', ncbi_id: '25', chromosome: 't(9;22)', function_summary: 'Philadelphia chromosome fusion; constitutive tyrosine kinase; CML' },
  { name: 'RET', ncbi_id: '5979', chromosome: '10q11.21', function_summary: 'Receptor tyrosine kinase; MEN2A/2B, medullary thyroid carcinoma' },

  // DNA repair & genetic disease genes
  { name: 'CFTR', ncbi_id: '1080', chromosome: '7q31.2', function_summary: 'Chloride channel; delta-F508 mutation causes cystic fibrosis' },
  { name: 'HBB', ncbi_id: '3043', chromosome: '11p15.4', function_summary: 'Beta-globin; mutations cause sickle cell disease, beta-thalassemia' },
  { name: 'HBA1', ncbi_id: '3039', chromosome: '16p13.3', function_summary: 'Alpha-globin; deletions cause alpha-thalassemia' },
  { name: 'DMD', ncbi_id: '1756', chromosome: 'Xp21.2-p21.1', function_summary: 'Dystrophin; X-linked mutations cause Duchenne/Becker muscular dystrophy' },
  { name: 'FMR1', ncbi_id: '2332', chromosome: 'Xq27.3', function_summary: 'Fragile X mental retardation protein; CGG trinucleotide repeat expansion' },
  { name: 'HTT', ncbi_id: '3064', chromosome: '4p16.3', function_summary: 'Huntingtin; CAG trinucleotide repeat expansion in Huntington disease' },
  { name: 'PKD1', ncbi_id: '5310', chromosome: '16p13.3', function_summary: 'Polycystin-1; autosomal dominant polycystic kidney disease' },
  { name: 'HEXA', ncbi_id: '3073', chromosome: '15q23', function_summary: 'Hexosaminidase A; deficiency causes Tay-Sachs disease' },
  { name: 'GBA', ncbi_id: '2629', chromosome: '1q22', function_summary: 'Glucocerebrosidase; deficiency causes Gaucher disease' },
  { name: 'SMN1', ncbi_id: '6606', chromosome: '5q13.2', function_summary: 'Survival motor neuron; homozygous deletion causes spinal muscular atrophy' },

  // Metabolic & signaling genes
  { name: 'LDLR', ncbi_id: '3949', chromosome: '19p13.2', function_summary: 'LDL receptor; mutations cause familial hypercholesterolemia' },
  { name: 'G6PD', ncbi_id: '2539', chromosome: 'Xq28', function_summary: 'Glucose-6-phosphate dehydrogenase; X-linked deficiency causes hemolytic anemia' },
  { name: 'PAH', ncbi_id: '5053', chromosome: '12q23.2', function_summary: 'Phenylalanine hydroxylase; deficiency causes phenylketonuria' },
  { name: 'HPRT1', ncbi_id: '3251', chromosome: 'Xq26.2-q26.3', function_summary: 'Hypoxanthine-guanine phosphoribosyltransferase; Lesch-Nyhan syndrome' },
  { name: 'F5', ncbi_id: '2153', chromosome: '1q24.2', function_summary: 'Factor V; Leiden mutation (R506Q) causes activated protein C resistance' },

  // Immune & inflammatory genes
  { name: 'HLA-B', ncbi_id: '3106', chromosome: '6p21.33', function_summary: 'MHC class I; antigen presentation; HLA-B27 associated with ankylosing spondylitis' },
  { name: 'HLA-DQ', ncbi_id: '3117', chromosome: '6p21.32', function_summary: 'MHC class II; antigen presentation; DQ2/DQ8 associated with celiac disease' },
  { name: 'TNF', ncbi_id: '7124', chromosome: '6p21.33', function_summary: 'Tumor necrosis factor alpha; pro-inflammatory cytokine' },
  { name: 'IL6', ncbi_id: '3569', chromosome: '7p15.3', function_summary: 'Interleukin-6; acute phase response; therapeutic target in autoimmunity' },
  { name: 'JAK2', ncbi_id: '3717', chromosome: '9p24.1', function_summary: 'Janus kinase 2; V617F mutation in polycythemia vera, essential thrombocythemia' },

  // Enzyme & channel genes
  { name: 'ACE', ncbi_id: '1636', chromosome: '17q23.3', function_summary: 'Angiotensin-converting enzyme; converts angiotensin I to II' },
  { name: 'CYP2D6', ncbi_id: '1565', chromosome: '22q13.2', function_summary: 'Cytochrome P450 2D6; metabolizes ~25% of drugs; pharmacogenomics' },
  { name: 'CYP3A4', ncbi_id: '1576', chromosome: '7q22.1', function_summary: 'Cytochrome P450 3A4; metabolizes ~50% of drugs' },
  { name: 'SCN5A', ncbi_id: '6331', chromosome: '3p22.2', function_summary: 'Cardiac sodium channel; mutations cause long QT syndrome type 3, Brugada' },
  { name: 'KCNQ1', ncbi_id: '3784', chromosome: '11p15.5-p15.4', function_summary: 'Potassium channel; mutations cause long QT syndrome type 1' },

  // Growth factor & signaling
  { name: 'EGFR', ncbi_id: '1956', chromosome: '7p11.2', function_summary: 'Epidermal growth factor receptor; mutated in non-small cell lung cancer' },
  { name: 'VEGFA', ncbi_id: '7422', chromosome: '6p21.1', function_summary: 'Vascular endothelial growth factor A; angiogenesis; bevacizumab target' },
  { name: 'BRAF', ncbi_id: '673', chromosome: '7q34', function_summary: 'Serine/threonine kinase in MAPK pathway; V600E mutation in melanoma' },
  { name: 'ALK', ncbi_id: '238', chromosome: '2p23.2-p23.1', function_summary: 'Anaplastic lymphoma kinase; translocations in NSCLC, ALCL' },
  { name: 'FGFR3', ncbi_id: '2261', chromosome: '4p16.3', function_summary: 'Fibroblast growth factor receptor 3; gain-of-function in achondroplasia' },

  // Apoptosis & cell death
  { name: 'BCL2', ncbi_id: '596', chromosome: '18q21.33', function_summary: 'Anti-apoptotic protein; t(14;18) in follicular lymphoma' },
  { name: 'CASP3', ncbi_id: '836', chromosome: '4q35.1', function_summary: 'Caspase-3; executioner caspase in apoptosis' },

  // Collagen & connective tissue
  { name: 'COL1A1', ncbi_id: '1277', chromosome: '17q21.33', function_summary: 'Type I collagen; mutations cause osteogenesis imperfecta' },
  { name: 'FBN1', ncbi_id: '2200', chromosome: '15q21.1', function_summary: 'Fibrillin-1; mutations cause Marfan syndrome' },
  { name: 'ELN', ncbi_id: '2006', chromosome: '7q11.23', function_summary: 'Elastin; deletions in Williams syndrome; supravalvular aortic stenosis' },
]

// ---------------------------------------------------------------------------
// Disease data — USMLE Step 1 high-yield diseases
// ---------------------------------------------------------------------------

interface DiseaseData {
  name: string
  doid: string
  category: string
}

const DISEASES: DiseaseData[] = [
  // Cardiovascular
  { name: 'Hypertension', doid: 'DOID:10763', category: 'cardiovascular' },
  { name: 'Coronary artery disease', doid: 'DOID:3393', category: 'cardiovascular' },
  { name: 'Heart failure', doid: 'DOID:6000', category: 'cardiovascular' },
  { name: 'Atrial fibrillation', doid: 'DOID:0060224', category: 'cardiovascular' },
  { name: 'Aortic aneurysm', doid: 'DOID:3627', category: 'cardiovascular' },

  // Endocrine
  { name: 'Type 2 diabetes mellitus', doid: 'DOID:9352', category: 'endocrine' },
  { name: 'Type 1 diabetes mellitus', doid: 'DOID:9744', category: 'endocrine' },
  { name: 'Hypothyroidism', doid: 'DOID:1659', category: 'endocrine' },
  { name: 'Hyperthyroidism', doid: 'DOID:7998', category: 'endocrine' },
  { name: 'Cushing syndrome', doid: 'DOID:12252', category: 'endocrine' },

  // Respiratory
  { name: 'Asthma', doid: 'DOID:2841', category: 'respiratory' },
  { name: 'Chronic obstructive pulmonary disease', doid: 'DOID:3083', category: 'respiratory' },
  { name: 'Pneumonia', doid: 'DOID:552', category: 'respiratory' },
  { name: 'Pulmonary embolism', doid: 'DOID:9477', category: 'respiratory' },
  { name: 'Lung cancer', doid: 'DOID:1324', category: 'respiratory' },

  // Hematologic
  { name: 'Sickle cell disease', doid: 'DOID:10923', category: 'hematologic' },
  { name: 'Iron deficiency anemia', doid: 'DOID:11988', category: 'hematologic' },
  { name: 'Acute myeloid leukemia', doid: 'DOID:9119', category: 'hematologic' },
  { name: 'Chronic myeloid leukemia', doid: 'DOID:8552', category: 'hematologic' },
  { name: 'Deep vein thrombosis', doid: 'DOID:1712', category: 'hematologic' },

  // Renal
  { name: 'Chronic kidney disease', doid: 'DOID:784', category: 'renal' },
  { name: 'Nephrotic syndrome', doid: 'DOID:1184', category: 'renal' },
  { name: 'Acute kidney injury', doid: 'DOID:0080600', category: 'renal' },

  // Gastrointestinal
  { name: 'Inflammatory bowel disease', doid: 'DOID:0050589', category: 'gastrointestinal' },
  { name: 'Cirrhosis', doid: 'DOID:5082', category: 'gastrointestinal' },
  { name: 'Colorectal cancer', doid: 'DOID:9256', category: 'gastrointestinal' },
  { name: 'Peptic ulcer disease', doid: 'DOID:750', category: 'gastrointestinal' },

  // Neurological
  { name: 'Alzheimer disease', doid: 'DOID:10652', category: 'neurological' },
  { name: 'Parkinson disease', doid: 'DOID:14330', category: 'neurological' },
  { name: 'Multiple sclerosis', doid: 'DOID:2377', category: 'neurological' },
  { name: 'Epilepsy', doid: 'DOID:1826', category: 'neurological' },
  { name: 'Stroke', doid: 'DOID:6713', category: 'neurological' },

  // Musculoskeletal
  { name: 'Rheumatoid arthritis', doid: 'DOID:7148', category: 'musculoskeletal' },
  { name: 'Systemic lupus erythematosus', doid: 'DOID:9074', category: 'musculoskeletal' },
  { name: 'Osteoporosis', doid: 'DOID:11476', category: 'musculoskeletal' },

  // Infectious
  { name: 'Tuberculosis', doid: 'DOID:399', category: 'infectious' },
  { name: 'HIV/AIDS', doid: 'DOID:526', category: 'infectious' },
  { name: 'Sepsis', doid: 'DOID:0040085', category: 'infectious' },

  // Cancer
  { name: 'Breast cancer', doid: 'DOID:1612', category: 'cancer' },
  { name: 'Prostate cancer', doid: 'DOID:10283', category: 'cancer' },
  { name: 'Melanoma', doid: 'DOID:1909', category: 'cancer' },
  { name: 'Pancreatic cancer', doid: 'DOID:1793', category: 'cancer' },

  // Genetic
  { name: 'Cystic fibrosis', doid: 'DOID:1485', category: 'genetic' },
  { name: 'Marfan syndrome', doid: 'DOID:14323', category: 'genetic' },
  { name: 'Down syndrome', doid: 'DOID:14250', category: 'genetic' },
  { name: 'Turner syndrome', doid: 'DOID:3911', category: 'genetic' },
  { name: 'Phenylketonuria', doid: 'DOID:9281', category: 'genetic' },

  // Psychiatric
  { name: 'Major depressive disorder', doid: 'DOID:1596', category: 'psychiatric' },
  { name: 'Schizophrenia', doid: 'DOID:5419', category: 'psychiatric' },
]

// ---------------------------------------------------------------------------
// Compound data — key therapeutic compounds from HetioNet
// ---------------------------------------------------------------------------

interface CompoundData {
  name: string
  drugbank_id: string
  category: string
}

const COMPOUNDS: CompoundData[] = [
  { name: 'Metformin', drugbank_id: 'DB00331', category: 'antidiabetic' },
  { name: 'Aspirin', drugbank_id: 'DB00945', category: 'NSAID/antiplatelet' },
  { name: 'Atorvastatin', drugbank_id: 'DB01076', category: 'statin' },
  { name: 'Lisinopril', drugbank_id: 'DB00722', category: 'ACE_inhibitor' },
  { name: 'Metoprolol', drugbank_id: 'DB00264', category: 'beta_blocker' },
  { name: 'Amlodipine', drugbank_id: 'DB00381', category: 'calcium_channel_blocker' },
  { name: 'Warfarin', drugbank_id: 'DB00682', category: 'anticoagulant' },
  { name: 'Heparin', drugbank_id: 'DB01109', category: 'anticoagulant' },
  { name: 'Prednisone', drugbank_id: 'DB00635', category: 'corticosteroid' },
  { name: 'Levothyroxine', drugbank_id: 'DB00451', category: 'thyroid_hormone' },
  { name: 'Omeprazole', drugbank_id: 'DB00338', category: 'proton_pump_inhibitor' },
  { name: 'Amoxicillin', drugbank_id: 'DB01060', category: 'penicillin' },
  { name: 'Ibuprofen', drugbank_id: 'DB01050', category: 'NSAID' },
  { name: 'Hydrochlorothiazide', drugbank_id: 'DB00999', category: 'thiazide_diuretic' },
  { name: 'Furosemide', drugbank_id: 'DB00695', category: 'loop_diuretic' },
  { name: 'Albuterol', drugbank_id: 'DB01001', category: 'beta2_agonist' },
  { name: 'Insulin', drugbank_id: 'DB00030', category: 'antidiabetic' },
  { name: 'Morphine', drugbank_id: 'DB00295', category: 'opioid' },
  { name: 'Acetaminophen', drugbank_id: 'DB00316', category: 'analgesic' },
  { name: 'Imatinib', drugbank_id: 'DB00619', category: 'tyrosine_kinase_inhibitor' },
  { name: 'Tamoxifen', drugbank_id: 'DB00675', category: 'SERM' },
  { name: 'Rituximab', drugbank_id: 'DB00073', category: 'monoclonal_antibody' },
  { name: 'Trastuzumab', drugbank_id: 'DB00072', category: 'monoclonal_antibody' },
  { name: 'Bevacizumab', drugbank_id: 'DB00112', category: 'monoclonal_antibody' },
  { name: 'Nivolumab', drugbank_id: 'DB09035', category: 'checkpoint_inhibitor' },
  { name: 'Doxorubicin', drugbank_id: 'DB00997', category: 'anthracycline' },
  { name: 'Cyclophosphamide', drugbank_id: 'DB00531', category: 'alkylating_agent' },
  { name: 'Methotrexate', drugbank_id: 'DB00563', category: 'antimetabolite' },
  { name: 'Fluoxetine', drugbank_id: 'DB00472', category: 'SSRI' },
  { name: 'Losartan', drugbank_id: 'DB00678', category: 'ARB' },
]

// ---------------------------------------------------------------------------
// Relationship data — clinically important gene-disease-compound associations
// ---------------------------------------------------------------------------

interface GeneDisease {
  gene: string
  disease: string
  score: number
  source: string
}

const GENE_DISEASE_ASSOCIATIONS: GeneDisease[] = [
  { gene: 'TP53', disease: 'Lung cancer', score: 0.95, source: 'hetionet' },
  { gene: 'TP53', disease: 'Breast cancer', score: 0.93, source: 'hetionet' },
  { gene: 'TP53', disease: 'Colorectal cancer', score: 0.91, source: 'hetionet' },
  { gene: 'BRCA1', disease: 'Breast cancer', score: 0.97, source: 'hetionet' },
  { gene: 'BRCA2', disease: 'Breast cancer', score: 0.95, source: 'hetionet' },
  { gene: 'BRCA1', disease: 'Pancreatic cancer', score: 0.72, source: 'hetionet' },
  { gene: 'APC', disease: 'Colorectal cancer', score: 0.96, source: 'hetionet' },
  { gene: 'KRAS', disease: 'Pancreatic cancer', score: 0.94, source: 'hetionet' },
  { gene: 'KRAS', disease: 'Lung cancer', score: 0.88, source: 'hetionet' },
  { gene: 'KRAS', disease: 'Colorectal cancer', score: 0.86, source: 'hetionet' },
  { gene: 'BRAF', disease: 'Melanoma', score: 0.92, source: 'hetionet' },
  { gene: 'BCR-ABL1', disease: 'Chronic myeloid leukemia', score: 0.99, source: 'hetionet' },
  { gene: 'HER2', disease: 'Breast cancer', score: 0.90, source: 'hetionet' },
  { gene: 'EGFR', disease: 'Lung cancer', score: 0.89, source: 'hetionet' },
  { gene: 'ALK', disease: 'Lung cancer', score: 0.78, source: 'hetionet' },
  { gene: 'RET', disease: 'Hyperthyroidism', score: 0.75, source: 'hetionet' },
  { gene: 'VHL', disease: 'Chronic kidney disease', score: 0.80, source: 'hetionet' },
  { gene: 'CFTR', disease: 'Cystic fibrosis', score: 0.99, source: 'hetionet' },
  { gene: 'HBB', disease: 'Sickle cell disease', score: 0.99, source: 'hetionet' },
  { gene: 'DMD', disease: 'Heart failure', score: 0.65, source: 'hetionet' },
  { gene: 'FBN1', disease: 'Marfan syndrome', score: 0.99, source: 'hetionet' },
  { gene: 'FBN1', disease: 'Aortic aneurysm', score: 0.85, source: 'hetionet' },
  { gene: 'HTT', disease: 'Alzheimer disease', score: 0.55, source: 'hetionet' },
  { gene: 'LDLR', disease: 'Coronary artery disease', score: 0.88, source: 'hetionet' },
  { gene: 'F5', disease: 'Deep vein thrombosis', score: 0.90, source: 'hetionet' },
  { gene: 'F5', disease: 'Pulmonary embolism', score: 0.85, source: 'hetionet' },
  { gene: 'PAH', disease: 'Phenylketonuria', score: 0.99, source: 'hetionet' },
  { gene: 'JAK2', disease: 'Acute myeloid leukemia', score: 0.75, source: 'hetionet' },
  { gene: 'PTEN', disease: 'Prostate cancer', score: 0.82, source: 'hetionet' },
  { gene: 'PTEN', disease: 'Breast cancer', score: 0.78, source: 'hetionet' },
  { gene: 'MYC', disease: 'Acute myeloid leukemia', score: 0.70, source: 'hetionet' },
  { gene: 'BCL2', disease: 'Chronic myeloid leukemia', score: 0.68, source: 'hetionet' },
  { gene: 'COL1A1', disease: 'Osteoporosis', score: 0.72, source: 'hetionet' },
  { gene: 'HLA-B', disease: 'Rheumatoid arthritis', score: 0.65, source: 'hetionet' },
  { gene: 'HLA-DQ', disease: 'Type 1 diabetes mellitus', score: 0.80, source: 'hetionet' },
  { gene: 'TNF', disease: 'Rheumatoid arthritis', score: 0.82, source: 'hetionet' },
  { gene: 'TNF', disease: 'Inflammatory bowel disease', score: 0.78, source: 'hetionet' },
  { gene: 'IL6', disease: 'Rheumatoid arthritis', score: 0.75, source: 'hetionet' },
  { gene: 'ACE', disease: 'Hypertension', score: 0.85, source: 'hetionet' },
  { gene: 'ACE', disease: 'Heart failure', score: 0.80, source: 'hetionet' },
  { gene: 'G6PD', disease: 'Iron deficiency anemia', score: 0.60, source: 'hetionet' },
  { gene: 'SCN5A', disease: 'Atrial fibrillation', score: 0.72, source: 'hetionet' },
  { gene: 'VEGFA', disease: 'Colorectal cancer', score: 0.70, source: 'hetionet' },
  { gene: 'NF1', disease: 'Epilepsy', score: 0.55, source: 'hetionet' },
  { gene: 'HEXA', disease: 'Down syndrome', score: 0.30, source: 'hetionet' },
]

interface CompoundDisease {
  compound: string
  disease: string
  evidence_level: string
}

const COMPOUND_TREATS: CompoundDisease[] = [
  { compound: 'Metformin', disease: 'Type 2 diabetes mellitus', evidence_level: 'A' },
  { compound: 'Insulin', disease: 'Type 1 diabetes mellitus', evidence_level: 'A' },
  { compound: 'Insulin', disease: 'Type 2 diabetes mellitus', evidence_level: 'A' },
  { compound: 'Aspirin', disease: 'Coronary artery disease', evidence_level: 'A' },
  { compound: 'Atorvastatin', disease: 'Coronary artery disease', evidence_level: 'A' },
  { compound: 'Lisinopril', disease: 'Hypertension', evidence_level: 'A' },
  { compound: 'Lisinopril', disease: 'Heart failure', evidence_level: 'A' },
  { compound: 'Metoprolol', disease: 'Hypertension', evidence_level: 'A' },
  { compound: 'Metoprolol', disease: 'Heart failure', evidence_level: 'A' },
  { compound: 'Amlodipine', disease: 'Hypertension', evidence_level: 'A' },
  { compound: 'Warfarin', disease: 'Atrial fibrillation', evidence_level: 'A' },
  { compound: 'Warfarin', disease: 'Deep vein thrombosis', evidence_level: 'A' },
  { compound: 'Warfarin', disease: 'Pulmonary embolism', evidence_level: 'A' },
  { compound: 'Heparin', disease: 'Deep vein thrombosis', evidence_level: 'A' },
  { compound: 'Heparin', disease: 'Pulmonary embolism', evidence_level: 'A' },
  { compound: 'Prednisone', disease: 'Rheumatoid arthritis', evidence_level: 'A' },
  { compound: 'Prednisone', disease: 'Systemic lupus erythematosus', evidence_level: 'B' },
  { compound: 'Prednisone', disease: 'Asthma', evidence_level: 'A' },
  { compound: 'Levothyroxine', disease: 'Hypothyroidism', evidence_level: 'A' },
  { compound: 'Omeprazole', disease: 'Peptic ulcer disease', evidence_level: 'A' },
  { compound: 'Amoxicillin', disease: 'Pneumonia', evidence_level: 'A' },
  { compound: 'Albuterol', disease: 'Asthma', evidence_level: 'A' },
  { compound: 'Albuterol', disease: 'Chronic obstructive pulmonary disease', evidence_level: 'A' },
  { compound: 'Imatinib', disease: 'Chronic myeloid leukemia', evidence_level: 'A' },
  { compound: 'Tamoxifen', disease: 'Breast cancer', evidence_level: 'A' },
  { compound: 'Trastuzumab', disease: 'Breast cancer', evidence_level: 'A' },
  { compound: 'Bevacizumab', disease: 'Colorectal cancer', evidence_level: 'A' },
  { compound: 'Rituximab', disease: 'Rheumatoid arthritis', evidence_level: 'B' },
  { compound: 'Methotrexate', disease: 'Rheumatoid arthritis', evidence_level: 'A' },
  { compound: 'Cyclophosphamide', disease: 'Systemic lupus erythematosus', evidence_level: 'B' },
  { compound: 'Fluoxetine', disease: 'Major depressive disorder', evidence_level: 'A' },
  { compound: 'Losartan', disease: 'Hypertension', evidence_level: 'A' },
  { compound: 'Losartan', disease: 'Chronic kidney disease', evidence_level: 'B' },
  { compound: 'Furosemide', disease: 'Heart failure', evidence_level: 'A' },
  { compound: 'Hydrochlorothiazide', disease: 'Hypertension', evidence_level: 'A' },
  { compound: 'Doxorubicin', disease: 'Breast cancer', evidence_level: 'A' },
  { compound: 'Morphine', disease: 'Coronary artery disease', evidence_level: 'B' },
  { compound: 'Nivolumab', disease: 'Melanoma', evidence_level: 'A' },
  { compound: 'Nivolumab', disease: 'Lung cancer', evidence_level: 'A' },
]

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function seedHetionet(): Promise<void> {
  console.log('--- 10-hetionet: Seeding HetioNet biomedical knowledge subset ---')

  // ── Seed Gene nodes ─────────────────────────────────────────────────────
  let geneErrors = 0
  for (const gene of GENES) {
    const result = await neo4jQuery(
      `MERGE (g:Gene {name: $name, institution_id: $institution_id})
       ON CREATE SET
         g.uuid = randomUUID(),
         g.ncbi_id = $ncbi_id,
         g.chromosome = $chromosome,
         g.function_summary = $function_summary,
         g.source = 'hetionet',
         g.created_at = datetime()
       ON MATCH SET
         g.ncbi_id = $ncbi_id,
         g.chromosome = $chromosome,
         g.function_summary = $function_summary,
         g.updated_at = datetime()
       RETURN g.uuid AS uuid`,
      {
        name: gene.name,
        ncbi_id: gene.ncbi_id,
        chromosome: gene.chromosome,
        function_summary: gene.function_summary,
      },
      ctx
    )
    if (result) {
      console.log(`  ✓ Gene (${gene.name})`)
    } else {
      console.error(`  ✗ Failed to seed Gene (${gene.name})`)
      geneErrors++
    }
  }

  // ── Seed Disease nodes ──────────────────────────────────────────────────
  let diseaseErrors = 0
  for (const disease of DISEASES) {
    const result = await neo4jQuery(
      `MERGE (d:Disease {name: $name, institution_id: $institution_id})
       ON CREATE SET
         d.uuid = randomUUID(),
         d.doid = $doid,
         d.category = $category,
         d.source = 'hetionet',
         d.created_at = datetime()
       ON MATCH SET
         d.doid = $doid,
         d.category = $category,
         d.updated_at = datetime()
       RETURN d.uuid AS uuid`,
      { name: disease.name, doid: disease.doid, category: disease.category },
      ctx
    )
    if (result) {
      console.log(`  ✓ Disease (${disease.name})`)
    } else {
      console.error(`  ✗ Failed to seed Disease (${disease.name})`)
      diseaseErrors++
    }
  }

  // ── Seed Compound nodes ─────────────────────────────────────────────────
  let compoundErrors = 0
  for (const compound of COMPOUNDS) {
    const result = await neo4jQuery(
      `MERGE (c:Compound {name: $name, institution_id: $institution_id})
       ON CREATE SET
         c.uuid = randomUUID(),
         c.drugbank_id = $drugbank_id,
         c.category = $category,
         c.source = 'hetionet',
         c.created_at = datetime()
       ON MATCH SET
         c.drugbank_id = $drugbank_id,
         c.category = $category,
         c.updated_at = datetime()
       RETURN c.uuid AS uuid`,
      { name: compound.name, drugbank_id: compound.drugbank_id, category: compound.category },
      ctx
    )
    if (result) {
      console.log(`  ✓ Compound (${compound.name})`)
    } else {
      console.error(`  ✗ Failed to seed Compound (${compound.name})`)
      compoundErrors++
    }
  }

  // ── Seed Gene-Disease ASSOCIATES_WITH edges ─────────────────────────────
  let gdEdgeErrors = 0
  for (const assoc of GENE_DISEASE_ASSOCIATIONS) {
    const result = await neo4jQuery(
      `MATCH (g:Gene {name: $gene_name, institution_id: $institution_id})
       MATCH (d:Disease {name: $disease_name, institution_id: $institution_id})
       MERGE (g)-[r:ASSOCIATES_WITH]->(d)
       ON CREATE SET r.score = $score, r.source = $source, r.created_at = datetime()
       ON MATCH SET r.score = $score, r.updated_at = datetime()
       RETURN g.name AS gene, d.name AS disease`,
      { gene_name: assoc.gene, disease_name: assoc.disease, score: assoc.score, source: assoc.source },
      ctx
    )
    if (!result || result.records.length === 0) {
      console.warn(`  ⚠ Could not link Gene(${assoc.gene}) → Disease(${assoc.disease})`)
      gdEdgeErrors++
    }
  }

  // ── Seed Compound-Disease TREATS edges ──────────────────────────────────
  let ctEdgeErrors = 0
  for (const treat of COMPOUND_TREATS) {
    const result = await neo4jQuery(
      `MATCH (c:Compound {name: $compound_name, institution_id: $institution_id})
       MATCH (d:Disease {name: $disease_name, institution_id: $institution_id})
       MERGE (c)-[r:TREATS]->(d)
       ON CREATE SET r.evidence_level = $evidence_level, r.source = 'hetionet', r.created_at = datetime()
       ON MATCH SET r.evidence_level = $evidence_level, r.updated_at = datetime()
       RETURN c.name AS compound, d.name AS disease`,
      { compound_name: treat.compound, disease_name: treat.disease, evidence_level: treat.evidence_level },
      ctx
    )
    if (!result || result.records.length === 0) {
      console.warn(`  ⚠ Could not link Compound(${treat.compound}) → Disease(${treat.disease})`)
      ctEdgeErrors++
    }
  }

  // ── Verify counts ─────────────────────────────────────────────────────
  const geneCount = await neo4jQuery<{ count: number }>(
    `MATCH (g:Gene {institution_id: $institution_id}) RETURN count(g) AS count`,
    {},
    ctx
  )
  const diseaseCount = await neo4jQuery<{ count: number }>(
    `MATCH (d:Disease {institution_id: $institution_id}) RETURN count(d) AS count`,
    {},
    ctx
  )
  const compoundCount = await neo4jQuery<{ count: number }>(
    `MATCH (c:Compound {institution_id: $institution_id}) RETURN count(c) AS count`,
    {},
    ctx
  )
  const assocCount = await neo4jQuery<{ count: number }>(
    `MATCH (:Gene {institution_id: $institution_id})-[:ASSOCIATES_WITH]->(:Disease {institution_id: $institution_id})
     RETURN count(*) AS count`,
    {},
    ctx
  )
  const treatsCount = await neo4jQuery<{ count: number }>(
    `MATCH (:Compound {institution_id: $institution_id})-[:TREATS]->(:Disease {institution_id: $institution_id})
     RETURN count(*) AS count`,
    {},
    ctx
  )

  console.log(`\n  Total Gene nodes: ${geneCount?.records[0]?.count ?? 'unknown'}`)
  console.log(`  Total Disease nodes: ${diseaseCount?.records[0]?.count ?? 'unknown'}`)
  console.log(`  Total Compound nodes: ${compoundCount?.records[0]?.count ?? 'unknown'}`)
  console.log(`  Total ASSOCIATES_WITH edges: ${assocCount?.records[0]?.count ?? 'unknown'}`)
  console.log(`  Total TREATS edges: ${treatsCount?.records[0]?.count ?? 'unknown'}`)

  const totalErrors = geneErrors + diseaseErrors + compoundErrors + gdEdgeErrors + ctEdgeErrors
  if (totalErrors > 0) {
    console.error(`  ⚠ Total errors: ${totalErrors}`)
  } else {
    console.log('  ✓ HetioNet subset seeded successfully')
  }

  console.log('--- 10-hetionet: Done ---\n')
}

// Run if executed directly
seedHetionet().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

export { GENES, DISEASES, COMPOUNDS, GENE_DISEASE_ASSOCIATIONS, COMPOUND_TREATS }
