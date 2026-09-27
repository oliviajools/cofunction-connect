import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Hält die Supabase-Session frisch und schickt nicht angemeldete Personen zur Anmeldung.
 * Im Demo-Modus (ohne Supabase-Variablen) passiert hier nichts.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let antwort = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(zuSetzen) {
        for (const { name, value } of zuSetzen) request.cookies.set(name, value);
        antwort = NextResponse.next({ request });
        for (const { name, value, options } of zuSetzen) antwort.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const pfad = request.nextUrl.pathname;
  const oeffentlich = pfad.startsWith("/login") || pfad.startsWith("/auth") || pfad.startsWith("/rechtliches");
  if (!data.user && !oeffentlich) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = "/login";
    ziel.search = "";
    return NextResponse.redirect(ziel);
  }
  return antwort;
}

export const config = {
  matcher: [
    // Alles außer statischen Dateien, Icons, Manifest und den Maschinen-Schnittstellen (eigene Prüfung)
    "/((?!_next/static|_next/image|api/eingang|api/verarbeitung|manifest.webmanifest|icon|apple-icon|icon-192.png|icon-512.png|favicon.ico).*)",
  ],
};
