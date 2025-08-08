module.exports = {
  extends: ['../../.eslintrc.js'],
  env: {
    jest: true,
    node: true,
  },
  globals: {
    jest: 'readonly',
    describe: 'readonly',
    it: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
  },
  rules: {
    // Allow console.log in tests
    'no-console': 'off',
  },
}
