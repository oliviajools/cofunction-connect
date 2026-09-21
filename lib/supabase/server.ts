import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseOeffentlicherSchluessel, supabaseUrl } from "../config";

/** Supabase-Client mit der Session der angemeldeten Person (Row Level Security greift). */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseOeffentlicherSchluessel, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(zuSetzen) {
        try {
          for (const { name, value, options } of zuSetzen) cookieStore.set(name, value, options);
        } catch {
          // In Server Components nicht erlaubt – der Proxy erneuert die Session.
        }
      },
    },
  });
}
