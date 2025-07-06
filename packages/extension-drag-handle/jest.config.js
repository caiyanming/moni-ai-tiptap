module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.{js,jsx,ts,tsx}', '**/*.(test|spec).{js,jsx,ts,tsx}'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 10000,
  verbose: true,
  // 🎯 支持DOM操作和事件模拟
  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
  // 🎯 模拟浏览器环境
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  // 🎯 支持ES模块
  extensionsToTreatAsEsm: ['.ts'],
  // 🎯 忽略特定警告
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // 🎯 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
