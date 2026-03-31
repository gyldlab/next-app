import { fixupConfigRules } from "@eslint/compat";
import { defineConfig, globalIgnores } from "eslint/config";
import type { Linter } from "eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

import preferSrcAlias from "./eslint-rules/prefer-src-alias";

const srcFilePatterns = ["src/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"];
const parentRelativeImportPattern = "^(?:\\.\\./)+";
const nextVitalsCompat = fixupConfigRules(nextVitals);
const nextTsCompat = fixupConfigRules(nextTs);

function scopeConfigToSrc(config: Linter.Config): Linter.Config {
  if (config.ignores) {
    return config;
  }

  if (config.files) {
    return {
      ...config,
      files: config.files.map((pattern) => `src/${pattern}`),
    };
  }

  return {
    ...config,
    files: srcFilePatterns,
  };
}

const eslintConfig = defineConfig([
  ...nextVitalsCompat.map(scopeConfigToSrc),
  ...nextTsCompat.map(scopeConfigToSrc),
  {
    files: ["src/**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    plugins: {
      local: {
        rules: {
          "prefer-src-alias": preferSrcAlias,
        },
      },
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
          vars: "all",
          varsIgnorePattern: "^_",
        },
      ],
      "local/prefer-src-alias": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: parentRelativeImportPattern,
              message: "Use @/ absolute imports instead of parent-relative imports inside src.",
            },
          ],
        },
      ],
      "simple-import-sort/imports": [
        "error",
        {
          groups: [["^\\u0000"], ["^node:"], ["^react$", "^next", "^@?\\w"], ["^@/"], ["^\\."]],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
