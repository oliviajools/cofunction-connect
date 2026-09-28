// Zentrale Konfiguration aus Umgebungsvariablen.
// Ohne Supabase-Variablen läuft die App im Demo-Modus mit Beispieldaten im Speicher.

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "";

export const supabaseOeffentlicherSchluessel =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

/** Nur auf dem Server verwenden (Mail-Eingang, Hintergrundverarbeitung). */
export function supabaseGeheimerSchluessel(): string {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export const istDemo = !supabaseUrl || !supabaseOeffentlicherSchluessel;

export function mistralSchluessel(): string {
  return process.env.MISTRAL_API_KEY ?? "";
}

export function mistralModell(): string {
  return process.env.MISTRAL_TRANSKRIPTION_MODELL ?? "voxtral-mini-latest";
}

/** Adresse für weitergeleitete Mails, z. B. wissen@cofunction.de */
export function mailAdresse(): string {
  return process.env.NEXT_PUBLIC_MAIL_ADRESSE ?? "wissen@cofunction.de";
}

/** Adresse mit Plus-Zusatz für ein Projekt: wissen+hockey@cofunction.de */
export function mailAdresseFuer(slug: string): string {
  const [lokal, domain] = mailAdresse().split("@");
  return `${lokal}+${slug}@${domain}`;
}

export function mailWebhookGeheimnis(): string {
  return process.env.MAIL_WEBHOOK_SECRET ?? "";
}

export function cronGeheimnis(): string {
  return process.env.CRON_SECRET ?? "";
}

export const SPEICHER_BUCKET = "dateien";
