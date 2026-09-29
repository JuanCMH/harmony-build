import { test as teardown } from "@playwright/test";

teardown("cierre de la suite", async () => {
  // La cuenta y el proyecto de pruebas se conservan entre ejecuciones: cada
  // prueba borra lo que crea.
});
