import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy (ex-middleware, Next 16) : CSP stricte à nonce + rafraîchissement de la
 * session Supabase. docs/securite.md §3.1. L'autorisation ne repose jamais
 * uniquement sur ce fichier (RLS + getUser() côté serveur).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const SUPABASE_WS = SUPABASE_URL.replace(/^https:/, "wss:");

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`, // requis : styles inline de Recharts / next/font
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'${SUPABASE_URL ? ` ${SUPABASE_URL} ${SUPABASE_WS}` : ""}`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp); // Next lit le nonce ici et l'applique à ses scripts

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (SUPABASE_URL && SUPABASE_KEY) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser(); // rafraîchit la session ; rien entre createServerClient et cet appel
  }

  response.headers.set("Content-Security-Policy", csp);
  // Pages potentiellement personnalisées : jamais en cache partagé.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|theme-init.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
