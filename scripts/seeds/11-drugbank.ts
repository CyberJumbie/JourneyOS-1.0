/**
 * scripts/seeds/11-drugbank.ts — Seed DrugBank pharmacology data into Neo4j
 *
 * Seeds high-yield pharmacology data for USMLE Step 1:
 *   - ~50 Drug nodes (top tested drugs with mechanisms)
 *   - ~40 DrugTarget nodes (protein targets)
 *   - TARGETS edges (Drug → DrugTarget)
 *   - INTERACTS_WITH edges (Drug ↔ Drug for key DDIs)
 *
 * Each Drug carries: name, drugbank_id, mechanism_class, mechanism_detail, institution_id.
 * Each DrugTarget carries: name, uniprot_id, target_type, institution_id.
 *
 * Idempotent: uses MERGE on {name, institution_id} composite key.
 *
 * Usage: pnpm tsx scripts/seeds/11-drugbank.ts
 */

import { neo4jQuery } from '../../packages/neo4j/client'

// ---------------------------------------------------------------------------
// Institution context
// ---------------------------------------------------------------------------
const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'msm-default'
const ctx = { institution_id: INSTITUTION_ID }

// ---------------------------------------------------------------------------
// Drug data — USMLE Step 1 high-yield drugs
// ---------------------------------------------------------------------------

interface DrugData {
  name: string
  drugbank_id: string
  mechanism_class: string
  mechanism_detail: string
}

const DRUGS: DrugData[] = [
  // Cardiovascular
  { name: 'Lisinopril', drugbank_id: 'DB00722', mechanism_class: 'ACE_inhibitor', mechanism_detail: 'Inhibits angiotensin-converting enzyme, preventing conversion of angiotensin I to angiotensin II' },
  { name: 'Losartan', drugbank_id: 'DB00678', mechanism_class: 'ARB', mechanism_detail: 'Selective AT1 receptor antagonist; blocks angiotensin II vasoconstriction' },
  { name: 'Metoprolol', drugbank_id: 'DB00264', mechanism_class: 'beta1_selective_blocker', mechanism_detail: 'Selective beta-1 adrenergic receptor antagonist; reduces heart rate and contractility' },
  { name: 'Propranolol', drugbank_id: 'DB00571', mechanism_class: 'nonselective_beta_blocker', mechanism_detail: 'Non-selective beta-adrenergic antagonist; blocks beta-1 and beta-2 receptors' },
  { name: 'Amlodipine', drugbank_id: 'DB00381', mechanism_class: 'dihydropyridine_CCB', mechanism_detail: 'L-type calcium channel blocker; vascular smooth muscle relaxation' },
  { name: 'Verapamil', drugbank_id: 'DB00661', mechanism_class: 'nondihydropyridine_CCB', mechanism_detail: 'L-type calcium channel blocker; reduces heart rate and AV conduction' },
  { name: 'Digoxin', drugbank_id: 'DB00390', mechanism_class: 'cardiac_glycoside', mechanism_detail: 'Inhibits Na+/K+ ATPase; increases intracellular calcium via Na+/Ca2+ exchanger' },
  { name: 'Amiodarone', drugbank_id: 'DB01118', mechanism_class: 'class_III_antiarrhythmic', mechanism_detail: 'Blocks potassium channels (class III), also has class I, II, IV properties' },
  { name: 'Warfarin', drugbank_id: 'DB00682', mechanism_class: 'vitamin_K_antagonist', mechanism_detail: 'Inhibits vitamin K epoxide reductase; blocks synthesis of factors II, VII, IX, X' },
  { name: 'Heparin', drugbank_id: 'DB01109', mechanism_class: 'indirect_thrombin_inhibitor', mechanism_detail: 'Activates antithrombin III; inhibits factors IIa (thrombin), Xa, IXa, XIa, XIIa' },
  { name: 'Rivaroxaban', drugbank_id: 'DB06228', mechanism_class: 'direct_factor_Xa_inhibitor', mechanism_detail: 'Direct selective inhibition of factor Xa in coagulation cascade' },
  { name: 'Clopidogrel', drugbank_id: 'DB00758', mechanism_class: 'P2Y12_inhibitor', mechanism_detail: 'Irreversibly blocks ADP P2Y12 receptor on platelets; inhibits aggregation' },
  { name: 'Nitroglycerin', drugbank_id: 'DB00727', mechanism_class: 'nitrate_vasodilator', mechanism_detail: 'Releases NO → activates guanylyl cyclase → cGMP → vascular smooth muscle relaxation' },
  { name: 'Hydralazine', drugbank_id: 'DB01275', mechanism_class: 'direct_vasodilator', mechanism_detail: 'Direct arteriolar vasodilator via cGMP-mediated smooth muscle relaxation' },

  // Diuretics
  { name: 'Hydrochlorothiazide', drugbank_id: 'DB00999', mechanism_class: 'thiazide_diuretic', mechanism_detail: 'Inhibits NaCl cotransporter in distal convoluted tubule' },
  { name: 'Furosemide', drugbank_id: 'DB00695', mechanism_class: 'loop_diuretic', mechanism_detail: 'Inhibits Na+/K+/2Cl- cotransporter in thick ascending limb of loop of Henle' },
  { name: 'Spironolactone', drugbank_id: 'DB00421', mechanism_class: 'aldosterone_antagonist', mechanism_detail: 'Competitive mineralocorticoid receptor antagonist in collecting duct' },
  { name: 'Acetazolamide', drugbank_id: 'DB00819', mechanism_class: 'carbonic_anhydrase_inhibitor', mechanism_detail: 'Inhibits carbonic anhydrase in proximal tubule; reduces HCO3- reabsorption' },
  { name: 'Mannitol', drugbank_id: 'DB00742', mechanism_class: 'osmotic_diuretic', mechanism_detail: 'Osmotically active; increases tubular fluid osmolarity preventing water reabsorption' },

  // GI / Anti-acid
  { name: 'Omeprazole', drugbank_id: 'DB00338', mechanism_class: 'proton_pump_inhibitor', mechanism_detail: 'Irreversibly inhibits H+/K+ ATPase in gastric parietal cells' },
  { name: 'Ranitidine', drugbank_id: 'DB00863', mechanism_class: 'H2_blocker', mechanism_detail: 'Competitive H2 histamine receptor antagonist; reduces basal and stimulated acid secretion' },
  { name: 'Ondansetron', drugbank_id: 'DB00904', mechanism_class: '5HT3_antagonist', mechanism_detail: 'Selective 5-HT3 receptor antagonist; prevents nausea and vomiting' },
  { name: 'Metoclopramide', drugbank_id: 'DB01233', mechanism_class: 'dopamine_antagonist_prokinetic', mechanism_detail: 'D2 antagonist; increases gastric motility and LES tone' },

  // Endocrine
  { name: 'Metformin', drugbank_id: 'DB00331', mechanism_class: 'biguanide', mechanism_detail: 'Activates AMP-kinase; decreases hepatic gluconeogenesis, increases insulin sensitivity' },
  { name: 'Glipizide', drugbank_id: 'DB01067', mechanism_class: 'sulfonylurea', mechanism_detail: 'Blocks ATP-sensitive K+ channels on beta cells; stimulates insulin secretion' },
  { name: 'Insulin', drugbank_id: 'DB00030', mechanism_class: 'insulin', mechanism_detail: 'Binds insulin receptor tyrosine kinase; promotes GLUT4 translocation' },
  { name: 'Levothyroxine', drugbank_id: 'DB00451', mechanism_class: 'thyroid_hormone', mechanism_detail: 'Synthetic T4; converted to active T3; binds nuclear thyroid hormone receptors' },
  { name: 'Methimazole', drugbank_id: 'DB00763', mechanism_class: 'thionamide', mechanism_detail: 'Inhibits thyroid peroxidase; blocks iodine organification and coupling' },
  { name: 'Prednisone', drugbank_id: 'DB00635', mechanism_class: 'glucocorticoid', mechanism_detail: 'Binds intracellular GR; inhibits NF-kB, phospholipase A2; anti-inflammatory' },

  // Anti-infective
  { name: 'Amoxicillin', drugbank_id: 'DB01060', mechanism_class: 'aminopenicillin', mechanism_detail: 'Inhibits transpeptidase (PBP); blocks peptidoglycan cross-linking' },
  { name: 'Vancomycin', drugbank_id: 'DB00512', mechanism_class: 'glycopeptide', mechanism_detail: 'Binds D-Ala-D-Ala terminus of peptidoglycan precursors; blocks transglycosylation' },
  { name: 'Ciprofloxacin', drugbank_id: 'DB00537', mechanism_class: 'fluoroquinolone', mechanism_detail: 'Inhibits DNA gyrase (topoisomerase II) and topoisomerase IV' },
  { name: 'Azithromycin', drugbank_id: 'DB00207', mechanism_class: 'macrolide', mechanism_detail: 'Binds 50S ribosomal subunit; blocks translocation step of protein synthesis' },
  { name: 'Trimethoprim', drugbank_id: 'DB00440', mechanism_class: 'dihydrofolate_reductase_inhibitor', mechanism_detail: 'Inhibits bacterial dihydrofolate reductase; blocks folate synthesis' },
  { name: 'Isoniazid', drugbank_id: 'DB00951', mechanism_class: 'antimycobacterial', mechanism_detail: 'Inhibits mycolic acid synthesis via InhA; activated by catalase-peroxidase (KatG)' },
  { name: 'Rifampin', drugbank_id: 'DB01045', mechanism_class: 'rifamycin', mechanism_detail: 'Inhibits bacterial DNA-dependent RNA polymerase beta subunit' },
  { name: 'Fluconazole', drugbank_id: 'DB00196', mechanism_class: 'azole_antifungal', mechanism_detail: 'Inhibits lanosterol 14-alpha-demethylase (CYP51); blocks ergosterol synthesis' },
  { name: 'Acyclovir', drugbank_id: 'DB00787', mechanism_class: 'guanosine_analog', mechanism_detail: 'Activated by viral thymidine kinase; inhibits viral DNA polymerase as chain terminator' },

  // Analgesic / Anti-inflammatory
  { name: 'Aspirin', drugbank_id: 'DB00945', mechanism_class: 'irreversible_COX_inhibitor', mechanism_detail: 'Irreversibly acetylates COX-1 (Ser530) and COX-2; inhibits TXA2 and prostaglandins' },
  { name: 'Ibuprofen', drugbank_id: 'DB01050', mechanism_class: 'nonselective_NSAID', mechanism_detail: 'Reversibly inhibits COX-1 and COX-2; reduces prostaglandin synthesis' },
  { name: 'Celecoxib', drugbank_id: 'DB00482', mechanism_class: 'COX2_selective_inhibitor', mechanism_detail: 'Selectively inhibits COX-2; spares COX-1 mediated GI protection and platelet TXA2' },
  { name: 'Acetaminophen', drugbank_id: 'DB00316', mechanism_class: 'analgesic_antipyretic', mechanism_detail: 'Central COX inhibition and TRPV1 activation; weak peripheral anti-inflammatory' },
  { name: 'Morphine', drugbank_id: 'DB00295', mechanism_class: 'mu_opioid_agonist', mechanism_detail: 'Activates mu-opioid receptors; Gi-coupled, inhibits adenylyl cyclase, opens K+ channels' },
  { name: 'Naloxone', drugbank_id: 'DB01183', mechanism_class: 'opioid_antagonist', mechanism_detail: 'Competitive antagonist at mu, kappa, and delta opioid receptors' },

  // Neuropsychiatric
  { name: 'Fluoxetine', drugbank_id: 'DB00472', mechanism_class: 'SSRI', mechanism_detail: 'Selective serotonin reuptake inhibitor; blocks SERT transporter' },
  { name: 'Haloperidol', drugbank_id: 'DB00502', mechanism_class: 'typical_antipsychotic', mechanism_detail: 'D2 receptor antagonist in mesolimbic pathway; high EPS risk' },
  { name: 'Lithium', drugbank_id: 'DB01356', mechanism_class: 'mood_stabilizer', mechanism_detail: 'Inhibits inositol monophosphatase and GSK-3beta; modulates neurotransmission' },
  { name: 'Phenytoin', drugbank_id: 'DB00252', mechanism_class: 'sodium_channel_blocker', mechanism_detail: 'Blocks voltage-gated Na+ channels in inactive state; reduces repetitive firing' },
  { name: 'Levodopa', drugbank_id: 'DB01235', mechanism_class: 'dopamine_precursor', mechanism_detail: 'Crosses BBB; converted to dopamine by DOPA decarboxylase in CNS' },
  { name: 'Sumatriptan', drugbank_id: 'DB00669', mechanism_class: '5HT1B_1D_agonist', mechanism_detail: '5-HT1B/1D receptor agonist; causes intracranial vasoconstriction, inhibits trigeminal activation' },

  // Oncology
  { name: 'Imatinib', drugbank_id: 'DB00619', mechanism_class: 'tyrosine_kinase_inhibitor', mechanism_detail: 'Inhibits BCR-ABL, c-KIT, and PDGFR tyrosine kinases' },
  { name: 'Tamoxifen', drugbank_id: 'DB00675', mechanism_class: 'SERM', mechanism_detail: 'Selective estrogen receptor modulator; antagonist in breast, agonist in bone/uterus' },
  { name: 'Methotrexate', drugbank_id: 'DB00563', mechanism_class: 'dihydrofolate_reductase_inhibitor', mechanism_detail: 'Inhibits DHFR; blocks tetrahydrofolate synthesis needed for purine/thymidylate' },
  { name: 'Cyclophosphamide', drugbank_id: 'DB00531', mechanism_class: 'nitrogen_mustard_alkylating', mechanism_detail: 'Cross-links DNA via alkylation of guanine N7; requires hepatic activation' },
  { name: 'Doxorubicin', drugbank_id: 'DB00997', mechanism_class: 'anthracycline', mechanism_detail: 'Intercalates DNA; inhibits topoisomerase II; generates free radicals' },
]

// ---------------------------------------------------------------------------
// DrugTarget data — protein targets
// ---------------------------------------------------------------------------

interface DrugTargetData {
  name: string
  uniprot_id: string
  target_type: string
}

const DRUG_TARGETS: DrugTargetData[] = [
  { name: 'Angiotensin-converting enzyme', uniprot_id: 'P12821', target_type: 'enzyme' },
  { name: 'Angiotensin II receptor type 1', uniprot_id: 'P30556', target_type: 'receptor' },
  { name: 'Beta-1 adrenergic receptor', uniprot_id: 'P08588', target_type: 'receptor' },
  { name: 'Beta-2 adrenergic receptor', uniprot_id: 'P07550', target_type: 'receptor' },
  { name: 'L-type calcium channel (Cav1.2)', uniprot_id: 'Q13936', target_type: 'ion_channel' },
  { name: 'Na+/K+ ATPase alpha-1', uniprot_id: 'P05023', target_type: 'transporter' },
  { name: 'Vitamin K epoxide reductase', uniprot_id: 'Q9BQB6', target_type: 'enzyme' },
  { name: 'Antithrombin III', uniprot_id: 'P01008', target_type: 'enzyme' },
  { name: 'Coagulation factor Xa', uniprot_id: 'P00742', target_type: 'enzyme' },
  { name: 'P2Y12 receptor', uniprot_id: 'Q9H244', target_type: 'receptor' },
  { name: 'Soluble guanylyl cyclase', uniprot_id: 'Q02108', target_type: 'enzyme' },
  { name: 'H+/K+ ATPase', uniprot_id: 'P20648', target_type: 'transporter' },
  { name: 'Histamine H2 receptor', uniprot_id: 'P25021', target_type: 'receptor' },
  { name: '5-HT3 receptor', uniprot_id: 'P46098', target_type: 'receptor' },
  { name: 'Dopamine D2 receptor', uniprot_id: 'P14416', target_type: 'receptor' },
  { name: 'AMP-activated protein kinase', uniprot_id: 'Q13131', target_type: 'enzyme' },
  { name: 'ATP-sensitive K+ channel (Kir6.2)', uniprot_id: 'Q14654', target_type: 'ion_channel' },
  { name: 'Insulin receptor', uniprot_id: 'P06213', target_type: 'receptor' },
  { name: 'Thyroid hormone receptor alpha', uniprot_id: 'P10827', target_type: 'receptor' },
  { name: 'Thyroid peroxidase', uniprot_id: 'P07202', target_type: 'enzyme' },
  { name: 'Glucocorticoid receptor', uniprot_id: 'P04150', target_type: 'receptor' },
  { name: 'Penicillin-binding protein', uniprot_id: 'P44469', target_type: 'enzyme' },
  { name: 'DNA gyrase subunit A', uniprot_id: 'P0AES4', target_type: 'enzyme' },
  { name: 'Bacterial 50S ribosomal subunit', uniprot_id: 'P0A7J6', target_type: 'structural' },
  { name: 'Dihydrofolate reductase (bacterial)', uniprot_id: 'P0ABQ4', target_type: 'enzyme' },
  { name: 'Enoyl-ACP reductase (InhA)', uniprot_id: 'P9WGR1', target_type: 'enzyme' },
  { name: 'DNA-dependent RNA polymerase', uniprot_id: 'P0A8V2', target_type: 'enzyme' },
  { name: 'Lanosterol 14-alpha-demethylase', uniprot_id: 'P10613', target_type: 'enzyme' },
  { name: 'Viral DNA polymerase', uniprot_id: 'P04293', target_type: 'enzyme' },
  { name: 'Cyclooxygenase-1 (COX-1)', uniprot_id: 'P23219', target_type: 'enzyme' },
  { name: 'Cyclooxygenase-2 (COX-2)', uniprot_id: 'P35354', target_type: 'enzyme' },
  { name: 'Mu-opioid receptor', uniprot_id: 'P35372', target_type: 'receptor' },
  { name: 'Serotonin transporter (SERT)', uniprot_id: 'P31645', target_type: 'transporter' },
  { name: 'Voltage-gated sodium channel (Nav1.1)', uniprot_id: 'P35498', target_type: 'ion_channel' },
  { name: 'DOPA decarboxylase', uniprot_id: 'P20711', target_type: 'enzyme' },
  { name: '5-HT1B receptor', uniprot_id: 'P28222', target_type: 'receptor' },
  { name: 'BCR-ABL tyrosine kinase', uniprot_id: 'P00519', target_type: 'enzyme' },
  { name: 'Estrogen receptor alpha', uniprot_id: 'P03372', target_type: 'receptor' },
  { name: 'Dihydrofolate reductase (human)', uniprot_id: 'P00374', target_type: 'enzyme' },
  { name: 'Topoisomerase II', uniprot_id: 'P11388', target_type: 'enzyme' },
  { name: 'Mineralocorticoid receptor', uniprot_id: 'P08235', target_type: 'receptor' },
  { name: 'Carbonic anhydrase II', uniprot_id: 'P00918', target_type: 'enzyme' },
  { name: 'NaCl cotransporter', uniprot_id: 'P55017', target_type: 'transporter' },
  { name: 'Na+/K+/2Cl- cotransporter', uniprot_id: 'P55011', target_type: 'transporter' },
]

// ---------------------------------------------------------------------------
// Drug → DrugTarget (TARGETS) edges
// ---------------------------------------------------------------------------

interface DrugTargetEdge {
  drug: string
  target: string
  action_type: string
}

const DRUG_TARGET_EDGES: DrugTargetEdge[] = [
  { drug: 'Lisinopril', target: 'Angiotensin-converting enzyme', action_type: 'inhibitor' },
  { drug: 'Losartan', target: 'Angiotensin II receptor type 1', action_type: 'antagonist' },
  { drug: 'Metoprolol', target: 'Beta-1 adrenergic receptor', action_type: 'antagonist' },
  { drug: 'Propranolol', target: 'Beta-1 adrenergic receptor', action_type: 'antagonist' },
  { drug: 'Propranolol', target: 'Beta-2 adrenergic receptor', action_type: 'antagonist' },
  { drug: 'Amlodipine', target: 'L-type calcium channel (Cav1.2)', action_type: 'blocker' },
  { drug: 'Verapamil', target: 'L-type calcium channel (Cav1.2)', action_type: 'blocker' },
  { drug: 'Digoxin', target: 'Na+/K+ ATPase alpha-1', action_type: 'inhibitor' },
  { drug: 'Warfarin', target: 'Vitamin K epoxide reductase', action_type: 'inhibitor' },
  { drug: 'Heparin', target: 'Antithrombin III', action_type: 'activator' },
  { drug: 'Rivaroxaban', target: 'Coagulation factor Xa', action_type: 'inhibitor' },
  { drug: 'Clopidogrel', target: 'P2Y12 receptor', action_type: 'antagonist' },
  { drug: 'Nitroglycerin', target: 'Soluble guanylyl cyclase', action_type: 'activator' },
  { drug: 'Omeprazole', target: 'H+/K+ ATPase', action_type: 'inhibitor' },
  { drug: 'Ranitidine', target: 'Histamine H2 receptor', action_type: 'antagonist' },
  { drug: 'Ondansetron', target: '5-HT3 receptor', action_type: 'antagonist' },
  { drug: 'Metoclopramide', target: 'Dopamine D2 receptor', action_type: 'antagonist' },
  { drug: 'Metformin', target: 'AMP-activated protein kinase', action_type: 'activator' },
  { drug: 'Glipizide', target: 'ATP-sensitive K+ channel (Kir6.2)', action_type: 'blocker' },
  { drug: 'Insulin', target: 'Insulin receptor', action_type: 'agonist' },
  { drug: 'Levothyroxine', target: 'Thyroid hormone receptor alpha', action_type: 'agonist' },
  { drug: 'Methimazole', target: 'Thyroid peroxidase', action_type: 'inhibitor' },
  { drug: 'Prednisone', target: 'Glucocorticoid receptor', action_type: 'agonist' },
  { drug: 'Amoxicillin', target: 'Penicillin-binding protein', action_type: 'inhibitor' },
  { drug: 'Ciprofloxacin', target: 'DNA gyrase subunit A', action_type: 'inhibitor' },
  { drug: 'Azithromycin', target: 'Bacterial 50S ribosomal subunit', action_type: 'inhibitor' },
  { drug: 'Trimethoprim', target: 'Dihydrofolate reductase (bacterial)', action_type: 'inhibitor' },
  { drug: 'Isoniazid', target: 'Enoyl-ACP reductase (InhA)', action_type: 'inhibitor' },
  { drug: 'Rifampin', target: 'DNA-dependent RNA polymerase', action_type: 'inhibitor' },
  { drug: 'Fluconazole', target: 'Lanosterol 14-alpha-demethylase', action_type: 'inhibitor' },
  { drug: 'Acyclovir', target: 'Viral DNA polymerase', action_type: 'inhibitor' },
  { drug: 'Aspirin', target: 'Cyclooxygenase-1 (COX-1)', action_type: 'irreversible_inhibitor' },
  { drug: 'Aspirin', target: 'Cyclooxygenase-2 (COX-2)', action_type: 'irreversible_inhibitor' },
  { drug: 'Ibuprofen', target: 'Cyclooxygenase-1 (COX-1)', action_type: 'reversible_inhibitor' },
  { drug: 'Ibuprofen', target: 'Cyclooxygenase-2 (COX-2)', action_type: 'reversible_inhibitor' },
  { drug: 'Celecoxib', target: 'Cyclooxygenase-2 (COX-2)', action_type: 'selective_inhibitor' },
  { drug: 'Morphine', target: 'Mu-opioid receptor', action_type: 'agonist' },
  { drug: 'Naloxone', target: 'Mu-opioid receptor', action_type: 'antagonist' },
  { drug: 'Fluoxetine', target: 'Serotonin transporter (SERT)', action_type: 'inhibitor' },
  { drug: 'Haloperidol', target: 'Dopamine D2 receptor', action_type: 'antagonist' },
  { drug: 'Phenytoin', target: 'Voltage-gated sodium channel (Nav1.1)', action_type: 'blocker' },
  { drug: 'Levodopa', target: 'DOPA decarboxylase', action_type: 'substrate' },
  { drug: 'Sumatriptan', target: '5-HT1B receptor', action_type: 'agonist' },
  { drug: 'Imatinib', target: 'BCR-ABL tyrosine kinase', action_type: 'inhibitor' },
  { drug: 'Tamoxifen', target: 'Estrogen receptor alpha', action_type: 'antagonist' },
  { drug: 'Methotrexate', target: 'Dihydrofolate reductase (human)', action_type: 'inhibitor' },
  { drug: 'Doxorubicin', target: 'Topoisomerase II', action_type: 'inhibitor' },
  { drug: 'Spironolactone', target: 'Mineralocorticoid receptor', action_type: 'antagonist' },
  { drug: 'Acetazolamide', target: 'Carbonic anhydrase II', action_type: 'inhibitor' },
  { drug: 'Hydrochlorothiazide', target: 'NaCl cotransporter', action_type: 'inhibitor' },
  { drug: 'Furosemide', target: 'Na+/K+/2Cl- cotransporter', action_type: 'inhibitor' },
]

// ---------------------------------------------------------------------------
// Drug-Drug interactions (INTERACTS_WITH) — high-yield DDIs
// ---------------------------------------------------------------------------

interface DrugInteraction {
  drug1: string
  drug2: string
  severity: string
  description: string
}

const DRUG_INTERACTIONS: DrugInteraction[] = [
  { drug1: 'Warfarin', drug2: 'Aspirin', severity: 'major', description: 'Increased bleeding risk: anticoagulant + antiplatelet synergy' },
  { drug1: 'Warfarin', drug2: 'Rifampin', severity: 'major', description: 'Rifampin induces CYP2C9/3A4; dramatically reduces warfarin levels' },
  { drug1: 'Warfarin', drug2: 'Fluconazole', severity: 'major', description: 'Fluconazole inhibits CYP2C9; increases warfarin levels and bleeding risk' },
  { drug1: 'Warfarin', drug2: 'Metronidazole', severity: 'moderate', description: 'Metronidazole inhibits warfarin metabolism via CYP2C9' },
  { drug1: 'Metformin', drug2: 'Ibuprofen', severity: 'moderate', description: 'NSAIDs reduce renal blood flow; may precipitate metformin-associated lactic acidosis' },
  { drug1: 'Lisinopril', drug2: 'Spironolactone', severity: 'major', description: 'Combined RAAS blockade; risk of hyperkalemia' },
  { drug1: 'Lisinopril', drug2: 'Losartan', severity: 'major', description: 'Dual RAAS blockade; increased risk of hyperkalemia and renal failure' },
  { drug1: 'Digoxin', drug2: 'Amiodarone', severity: 'major', description: 'Amiodarone inhibits P-glycoprotein; raises digoxin levels 70-100%' },
  { drug1: 'Digoxin', drug2: 'Furosemide', severity: 'moderate', description: 'Loop diuretic-induced hypokalemia increases digoxin toxicity risk' },
  { drug1: 'Fluoxetine', drug2: 'Morphine', severity: 'moderate', description: 'Serotonergic effects of tramadol + SSRI may cause serotonin syndrome' },
  { drug1: 'Ciprofloxacin', drug2: 'Phenytoin', severity: 'moderate', description: 'Ciprofloxacin inhibits CYP1A2; may increase phenytoin levels' },
  { drug1: 'Isoniazid', drug2: 'Rifampin', severity: 'moderate', description: 'Both hepatotoxic; rifampin induces isoniazid metabolism via CYP2E1' },
  { drug1: 'Methotrexate', drug2: 'Trimethoprim', severity: 'major', description: 'Both inhibit folate metabolism; synergistic bone marrow suppression' },
  { drug1: 'Aspirin', drug2: 'Ibuprofen', severity: 'moderate', description: 'Ibuprofen may block aspirins irreversible platelet COX-1 acetylation' },
  { drug1: 'Lithium', drug2: 'Hydrochlorothiazide', severity: 'major', description: 'Thiazides reduce lithium clearance; risk of lithium toxicity' },
]

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function seedDrugbank(): Promise<void> {
  console.log('--- 11-drugbank: Seeding DrugBank pharmacology data ---')

  // ── Seed Drug nodes ─────────────────────────────────────────────────────
  let drugErrors = 0
  for (const drug of DRUGS) {
    const result = await neo4jQuery(
      `MERGE (d:Drug {name: $name, institution_id: $institution_id})
       ON CREATE SET
         d.uuid = randomUUID(),
         d.drugbank_id = $drugbank_id,
         d.mechanism_class = $mechanism_class,
         d.mechanism_detail = $mechanism_detail,
         d.source = 'drugbank',
         d.created_at = datetime()
       ON MATCH SET
         d.drugbank_id = $drugbank_id,
         d.mechanism_class = $mechanism_class,
         d.mechanism_detail = $mechanism_detail,
         d.updated_at = datetime()
       RETURN d.uuid AS uuid`,
      {
        name: drug.name,
        drugbank_id: drug.drugbank_id,
        mechanism_class: drug.mechanism_class,
        mechanism_detail: drug.mechanism_detail,
      },
      ctx
    )
    if (result) {
      console.log(`  ✓ Drug (${drug.name})`)
    } else {
      console.error(`  ✗ Failed to seed Drug (${drug.name})`)
      drugErrors++
    }
  }

  // ── Seed DrugTarget nodes ───────────────────────────────────────────────
  let targetErrors = 0
  for (const target of DRUG_TARGETS) {
    const result = await neo4jQuery(
      `MERGE (t:DrugTarget {name: $name, institution_id: $institution_id})
       ON CREATE SET
         t.uuid = randomUUID(),
         t.uniprot_id = $uniprot_id,
         t.target_type = $target_type,
         t.source = 'drugbank',
         t.created_at = datetime()
       ON MATCH SET
         t.uniprot_id = $uniprot_id,
         t.target_type = $target_type,
         t.updated_at = datetime()
       RETURN t.uuid AS uuid`,
      { name: target.name, uniprot_id: target.uniprot_id, target_type: target.target_type },
      ctx
    )
    if (result) {
      console.log(`  ✓ DrugTarget (${target.name})`)
    } else {
      console.error(`  ✗ Failed to seed DrugTarget (${target.name})`)
      targetErrors++
    }
  }

  // ── Seed TARGETS edges (Drug → DrugTarget) ──────────────────────────────
  let targetsEdgeErrors = 0
  for (const edge of DRUG_TARGET_EDGES) {
    const result = await neo4jQuery(
      `MATCH (d:Drug {name: $drug_name, institution_id: $institution_id})
       MATCH (t:DrugTarget {name: $target_name, institution_id: $institution_id})
       MERGE (d)-[r:TARGETS]->(t)
       ON CREATE SET r.action_type = $action_type, r.source = 'drugbank', r.created_at = datetime()
       ON MATCH SET r.action_type = $action_type, r.updated_at = datetime()
       RETURN d.name AS drug, t.name AS target`,
      { drug_name: edge.drug, target_name: edge.target, action_type: edge.action_type },
      ctx
    )
    if (!result || result.records.length === 0) {
      console.warn(`  ⚠ Could not link Drug(${edge.drug}) → DrugTarget(${edge.target})`)
      targetsEdgeErrors++
    }
  }

  // ── Seed INTERACTS_WITH edges (Drug ↔ Drug) ─────────────────────────────
  let interactionErrors = 0
  for (const ddi of DRUG_INTERACTIONS) {
    const result = await neo4jQuery(
      `MATCH (d1:Drug {name: $drug1, institution_id: $institution_id})
       MATCH (d2:Drug {name: $drug2, institution_id: $institution_id})
       MERGE (d1)-[r:INTERACTS_WITH]->(d2)
       ON CREATE SET r.severity = $severity, r.description = $description,
                     r.source = 'drugbank', r.created_at = datetime()
       ON MATCH SET r.severity = $severity, r.description = $description,
                    r.updated_at = datetime()
       RETURN d1.name AS drug1, d2.name AS drug2`,
      { drug1: ddi.drug1, drug2: ddi.drug2, severity: ddi.severity, description: ddi.description },
      ctx
    )
    if (!result || result.records.length === 0) {
      // Some drugs may be in HetioNet compounds but not Drug nodes — that is expected
      // for drugs like Metronidazole which are not in the DRUGS array
      console.warn(`  ⚠ Could not link DDI: ${ddi.drug1} ↔ ${ddi.drug2}`)
      interactionErrors++
    }
  }

  // ── Verify counts ─────────────────────────────────────────────────────
  const drugCount = await neo4jQuery<{ count: number }>(
    `MATCH (d:Drug {institution_id: $institution_id}) RETURN count(d) AS count`,
    {},
    ctx
  )
  const targetCount = await neo4jQuery<{ count: number }>(
    `MATCH (t:DrugTarget {institution_id: $institution_id}) RETURN count(t) AS count`,
    {},
    ctx
  )
  const targetsEdgeCount = await neo4jQuery<{ count: number }>(
    `MATCH (:Drug {institution_id: $institution_id})-[:TARGETS]->(:DrugTarget {institution_id: $institution_id})
     RETURN count(*) AS count`,
    {},
    ctx
  )
  const interactionCount = await neo4jQuery<{ count: number }>(
    `MATCH (:Drug {institution_id: $institution_id})-[:INTERACTS_WITH]->(:Drug {institution_id: $institution_id})
     RETURN count(*) AS count`,
    {},
    ctx
  )

  console.log(`\n  Total Drug nodes: ${drugCount?.records[0]?.count ?? 'unknown'}`)
  console.log(`  Total DrugTarget nodes: ${targetCount?.records[0]?.count ?? 'unknown'}`)
  console.log(`  Total TARGETS edges: ${targetsEdgeCount?.records[0]?.count ?? 'unknown'}`)
  console.log(`  Total INTERACTS_WITH edges: ${interactionCount?.records[0]?.count ?? 'unknown'}`)

  const totalErrors = drugErrors + targetErrors + targetsEdgeErrors + interactionErrors
  if (totalErrors > 0) {
    console.error(`  ⚠ Total errors: ${totalErrors}`)
  } else {
    console.log('  ✓ DrugBank data seeded successfully')
  }

  console.log('--- 11-drugbank: Done ---\n')
}

// Run if executed directly
seedDrugbank().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})

export { DRUGS, DRUG_TARGETS, DRUG_TARGET_EDGES, DRUG_INTERACTIONS }
