/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  // The Next build output contains copies of the workspace package.json files.
  modulePathIgnorePatterns: ['<rootDir>/apps/web/.next/'],
  moduleNameMapper: {
    '^@resume/(.*)$': '<rootDir>/packages/$1/src',
    // Package sources use '.js' specifiers for sibling .ts files.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
};
