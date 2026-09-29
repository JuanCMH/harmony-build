import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";

const isAuthPage = createRouteMatcher(["/auth"]);
// Ninguna ruta de dominio es pública: no hay landing ni páginas que se lean
// sin sesión. Una ruta que deba serlo se declara aquí, o el `matcher` de abajo
// —que incluye `/(api|trpc)(.*)`— la redirige a `/auth`.
const isPublicPage = createRouteMatcher([]);

/** Session cookie lifetime, in SECONDS — `cookieConfig.maxAge` is not in ms.
 *  Must match the refresh token lifetime configured in `convex/auth.ts`. */
const SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const AUTH_COOKIES = ["__convexAuthJWT", "__convexAuthRefreshToken"];

const convexMiddleware = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isPublicPage(request)) return;

    if (!isAuthPage(request) && !(await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/auth");
    }
    if (isAuthPage(request) && (await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/projects");
    }
  },
  {
    cookieConfig: {
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    },
  },
);

/**
 * Una sesión que ya no se puede canjear manda al login, no a un 404.
 *
 * Cuando el JWT ha caducado, `convexAuthNextjsMiddleware` intenta usar el
 * refresh token. Si ese token no es legible —una cookie vieja, de otro
 * despliegue, o de una sesión que ya no existe—, la librería decide mandar a
 * `/auth` y borrar las cookies, pero devuelve una respuesta contradictoria:
 * `200` con la cabecera `location` puesta **y** `x-middleware-next: 1`. Next
 * hace caso al «continúa», descarta el destino, y la petición termina en la
 * página de 404: la aplicación entera respondía «la página que buscas no
 * existe» cuando lo que pasaba era que había que volver a entrar.
 *
 * Aquí esa respuesta se convierte en la redirección que pretendía ser, con las
 * cookies ilegibles borradas —si no, el siguiente intento se rompe igual—.
 */
export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const response = (await convexMiddleware(request, event)) as
    | NextResponse
    | undefined;

  const location = response?.headers.get("location");
  const continues = response?.headers.get("x-middleware-next") === "1";

  if (!response || !location || !continues) return response;

  // El destino se reconstruye sobre la URL de la petición: la cabecera trae el
  // host con el que arrancó el servidor, que en desarrollo es `0.0.0.0`.
  const target = new URL(location, request.url);
  const redirect = NextResponse.redirect(
    new URL(`${target.pathname}${target.search}`, request.url),
  );

  for (const cookie of AUTH_COOKIES) redirect.cookies.delete(cookie);

  return redirect;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
