/**
 * Evidence grade weights for TEACHES edges (Rule 9 / G06)
 *
 * Cold-start = C (0.65)
 * Post-P2 UMLS enrichment = B (0.82)
 * Post-faculty-review = A (1.00)
 * Unverified/deprecated = D (0.45)
 */
export const EVIDENCE_GRADE_WEIGHT = {
  A: 1.00,
  B: 0.82,
  C: 0.65,
  D: 0.45,
} as const

export type EvidenceGrade = keyof typeof EVIDENCE_GRADE_WEIGHT
