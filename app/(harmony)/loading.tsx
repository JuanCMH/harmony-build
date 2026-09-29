/**
 * La frontera de Suspense del grupo con sesión.
 *
 * Era una copia literal de `app/loading.tsx`. En la práctica no se ve casi
 * nunca —todas las páginas de `(harmony)/` son cliente y resuelven su carga con
 * `isLoading` (`02 §2`)—, y dos ficheros idénticos son dos sitios donde
 * cambiar la marca de arranque.
 */
export { default } from "../loading";
