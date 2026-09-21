import type { BereichArt, EintragArt, EintragStatus } from "./data/types";

export const ART_NAME: Record<EintragArt, string> = {
  sprache: "Sprachnotiz",
  meeting: "Meeting",
  mail: "Mail",
  datei: "Datei",
  text: "Text",
  baustein: "Baustein",
  idee: "Idee",
};

export const BEREICH_NAME: Record<BereichArt, string> = {
  projekt: "Projekt",
  area: "Area",
  ressource: "Ressource",
  archiv: "Archiv",
};

export const BEREICH_MEHRZAHL: Record<BereichArt, string> = {
  projekt: "Projekte",
  area: "Areas",
  ressource: "Ressourcen",
  archiv: "Archiv",
};

export const STATUS_TEXT: Record<EintragStatus, string> = {
  verarbeitung: "Wird verarbeitet …",
  bereit: "Bereit",
  fehler: "Fehler",
  ohne_transkription: "Ohne Transkription",
};

const TZ = "Europe/Berlin";

/** „vor 5 Min.“, „heute 14:12“, „gestern“, „Mo“, „12.09.“ */
export function wann(iso: string, jetzt: Date = new Date()): string {
  const d = new Date(iso);
  const diff = (jetzt.getTime() - d.getTime()) / 60000;
  if (diff < 1) return "gerade eben";
  if (diff < 60) return `vor ${Math.round(diff)} Min.`;
  const tag = (x: Date) => x.toLocaleDateString("de-DE", { timeZone: TZ });
  const uhr = d.toLocaleTimeString("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  if (tag(d) === tag(jetzt)) return `heute ${uhr}`;
  const gestern = new Date(jetzt.getTime() - 86400000);
  if (tag(d) === tag(gestern)) return `gestern ${uhr}`;
  if (diff < 60 * 24 * 6) return d.toLocaleDateString("de-DE", { timeZone: TZ, weekday: "short" }).replace(".", "");
  return d.toLocaleDateString("de-DE", { timeZone: TZ, day: "2-digit", month: "2-digit", year: d.getFullYear() === jetzt.getFullYear() ? undefined : "2-digit" });
}

export function datumLang(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Sekunden → „0:48“, „42:10“, „1:05:03“ */
export function dauer(sek: number | null | undefined): string {
  if (!sek && sek !== 0) return "";
  const h = Math.floor(sek / 3600);
  const m = Math.floor((sek % 3600) / 60);
  const s = Math.floor(sek % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export function groesse(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function mehrzahl(n: number, eins: string, viele: string): string {
  return `${n} ${n === 1 ? eins : viele}`;
}

/** Minuten seit einem Zeitpunkt (für „hängt die Verarbeitung?“). */
export function minutenSeit(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 60000;
}
