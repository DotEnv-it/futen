module.exports = {
  extends: [
    'standard',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  rules: {
    '@typescript-eslint/no-unsafe-declaration-merging': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'dot-notation': 'off',
    'space-before-function-paren': 'off'
  },
  plugins: [
    'prettier',
    '@typescript-eslint'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  ignorePatterns: [
    'examples/*',
    'node_modules/',
    'dist/'
  ]
}
