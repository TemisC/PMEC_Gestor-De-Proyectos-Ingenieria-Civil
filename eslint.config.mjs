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
    // SPA de referencia (project-management-dashboard) vive acá para
    // consulta, pero no es parte del build de PMEC ni tiene sus propias
    // dependencias instaladas.
    "SPAVicent/**",
  ]),
]);

export default eslintConfig;
