module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    // If you have module aliases in tsconfig.json, map them here
    // For example: '@/(.*)': '<rootDir>/src/$1'
  },
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
};
