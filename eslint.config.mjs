// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
  files: ['**/*.js', '**/*.ts', '**/*.vue'],
  rules: {
    // Enforce consistent spacing
    semi: ['error', 'always'],
    quotes: ['error', 'single'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],

    // Vue specific rules
    'vue/multi-word-component-names': 'off',
    'vue/html-self-closing': [
      'error',
      {
        html: {
          void: 'always',
          normal: 'always',
          component: 'always'
        }
      }
    ],
    'vue/html-indent': [
      'error',
      2, // Enforce 2 spaces of indentation for <template>
      {
        attribute: 1,
        baseIndent: 1,
        closeBracket: 0,
        alignAttributesVertically: true
      }
    ],
    'vue/html-closing-bracket-newline': [
      'error',
      {
        singleline: 'never', // No newline for single-line elements
        multiline: 'always' // Always newline for multi-line elements
      }
    ],
    'vue/max-attributes-per-line': [
      'error',
      {
        singleline: 3,
        multiline: 1
      }
    ],

    // TypeScript rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error'

    // Best practices
    // 'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    // 'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
  }
});
