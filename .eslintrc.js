module.exports = {
  root: true,
  extends: ['next/core-web-vitals', '@typescript-eslint/recommended'],
  rules: {
    // AP-01: Block raw neo4j-driver imports (canonical C05)
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['neo4j-driver'],
          message: 'Use @journey/neo4j/client. Never import raw driver (Rule 1 / C05 / AP-01).'
        },
        {
          group: ['*/packages/neo4j/driver'],
          message: 'Never import driver directly. Use @journey/neo4j/client.'
        }
      ]
    }],
    // AP-04: Warn on hardcoded model strings (should use constants)
    'no-restricted-syntax': ['warn', {
      selector: 'Literal[value=/claude-(sonnet|haiku)-[0-9]/]',
      message: 'Use SONNET_MODEL or HAIKU_MODEL from @journey/ai/constants (Rule 4 / D05 / AP-04).'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-non-null-assertion': 'warn',
  },
  overrides: [
    {
      // Allow driver import only in the driver file itself
      files: ['packages/neo4j/driver.ts', 'packages/neo4j/driver.js'],
      rules: { 'no-restricted-imports': 'off' }
    },
    {
      // Allow model strings in constants.ts only
      files: ['packages/ai/constants.ts', 'packages/types/constants.ts'],
      rules: { 'no-restricted-syntax': 'off' }
    }
  ]
}
