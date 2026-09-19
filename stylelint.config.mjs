export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: ['**/node_modules/**', '**/dist*/**', 'apps/web/src/components/**'],
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
  ],
  rules: {
    'at-rule-empty-line-before': null,
    'declaration-block-single-line-max-declarations': null,
    'media-feature-range-notation': null,
    'no-descending-specificity': null,
    'selector-class-pattern': null,
    'value-keyword-case': null,
  },
}
