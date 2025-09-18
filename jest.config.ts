import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig: Config = {
  coverageProvider: "v8",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\.(ts|tsx|js|jsx)$": "ts-jest",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@testing-library/react/|@hookform/resolvers/)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
};

export default createJestConfig(customJestConfig);
