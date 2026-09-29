import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  /** Runtime automático de JSX.
   *
   *  `tsconfig.json` declara `jsx: "preserve"` porque quien transpila en la
   *  aplicación es Next, y con eso el transpilador de las pruebas cae al
   *  runtime **clásico**, que espera un `React` en el ámbito. Ningún componente
   *  del repositorio importa React —no hace falta desde React 17—, así que
   *  cualquier prueba que renderice uno revienta con
   *  `ReferenceError: React is not defined`, y el mensaje no apunta al archivo
   *  que lo causa. Desde Vitest 4.1 quien transpila es oxc, no esbuild. */
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    include: ["**/__tests__/**/*.test.ts"],
    /** Las suites de `convex/__tests__/` montan el schema completo con
     *  `convex-test`. En arranque en frío ese primer import se come los 5 s por
     *  defecto y el primer test de cada archivo cae por timeout aunque el gate
     *  que prueba esté bien. No es lentitud del test: es el coste del módulo. */
    testTimeout: 20000,
  },
});
