import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { istDemo } from "../config";
import { DemoRepo, demoStore } from "./demo-repo";
import type { Repo } from "./types";

export const DEMO_NUTZER_COOKIE = "demo_nutzer";

/**
 * Zugriff im Namen der angemeldeten Person. Pro Anfrage einmal erzeugt.
 * Ohne Anmeldung (Supabase-Modus) geht es zur Login-Seite.
 */
export const getRepo = cache(async (): Promise<Repo> => {
  if (istDemo) {
    const id = (await cookies()).get(DEMO_NUTZER_COOKIE)?.value;
    const gueltig = demoStore().profile.some((p) => p.id === id);
    return new DemoRepo(gueltig ? id : "u-olivia");
  }
  const { supabaseServer } = await import("../supabase/server");
  const { SupabaseRepo } = await import("./supabase-repo");
  const db = await supabaseServer();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  return new SupabaseRepo(db, data.user.id);
});

/**
 * Systemzugriff (Mail-Eingang, Cron). Handelt im Namen von `nutzerId`,
 * umgeht aber Row Level Security – nur serverseitig und nach eigener Prüfung verwenden.
 */
export async function systemRepo(nutzerId?: string): Promise<Repo> {
  if (istDemo) return new DemoRepo(nutzerId ?? "u-olivia");
  const { supabaseAdmin } = await import("../supabase/admin");
  const { SupabaseRepo } = await import("./supabase-repo");
  return new SupabaseRepo(supabaseAdmin(), nutzerId ?? "00000000-0000-0000-0000-000000000000");
}
