import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  // header.tsx es zona protegida (ver CLAUDE.md). scripts/ son herramientas de
  // terminal en CommonJS que `next lint` nunca revisaba: se mantiene el alcance.
  globalIgnores(["src/components/header.tsx", "scripts/**", "playwright-report/**", "test-results/**", "scratch/**"]),
  {
    extends: [...nextCoreWebVitals, ...nextTypescript],
    rules: {
      // Reglas nuevas de eslint-plugin-react-hooks v7, pensadas para el React
      // Compiler, que este proyecto no usa. Marcan patrones que funcionan bien
      // hoy (setState dentro de useEffect, componentes declarados en render).
      // Quedan como aviso para corregirlas de a poco sin cambiar comportamiento.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);
