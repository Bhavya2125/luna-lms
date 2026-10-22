import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Reading localStorage / navigator once on mount is intentional in the client components.
      "react-hooks/set-state-in-effect": "off",
      // Plain apostrophes in UI copy are fine.
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
