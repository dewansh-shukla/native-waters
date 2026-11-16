import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "artifacts/**",
    ".superpowers/**",
    ".agents/**",
    ".taste-skill/**",
    ".cache/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    "playwright/.cache/**",
    "next-env.d.ts",
  ]),
]);
