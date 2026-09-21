import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Ziel des Anmeldelinks aus der Mail (PKCE-Code gegen Session tauschen). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await (await supabaseServer()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", url.origin));
  }
  return NextResponse.redirect(new URL("/login?fehler=link", url.origin));
}
