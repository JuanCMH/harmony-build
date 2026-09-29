import { redirect } from "next/navigation";

/** No hay página de entrada pública: la raíz lleva a la aplicación, y el
 *  middleware manda a `/auth` a quien no tiene sesión. */
export default function RootPage() {
  redirect("/projects");
}
