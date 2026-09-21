import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseGeheimerSchluessel, supabaseUrl } from "../config";

/**
 * Systemzugriff mit geheimem Schlüssel – umgeht Row Level Security.
 * Nur für Mail-Eingang und Hintergrundverarbeitung verwenden, nie im Browser.
 */
export function supabaseAdmin() {
  const schluessel = supabaseGeheimerSchluessel();
  if (!schluessel) throw new Error("SUPABASE_SECRET_KEY fehlt");
  return createClient(supabaseUrl, schluessel, { auth: { persistSession: false, autoRefreshToken: false } });
}
