/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.spec.ts", "**/src/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/.next/"],
  moduleNameMapper: {
    "^@deploysentinel/([^/]+)$": "<rootDir>/packages/$1/src/index.ts",
    "^@deploysentinel/([^/]+)/(.*)$": "<rootDir>/packages/$1/src/$2",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2022",
          module: "CommonJS",
          moduleResolution: "node",
          esModuleInterop: true,
          skipLibCheck: true,
          isolatedModules: true,
        },
        diagnostics: {
          ignoreCodes: [151002],
        },
      },
    ],
  },
};
