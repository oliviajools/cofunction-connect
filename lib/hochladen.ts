"use client";

import type { UploadZiel } from "./data/types";

/**
 * Lädt eine Datei direkt in den Speicher hoch (am Server vorbei – wichtig für lange
 * Meeting-Aufnahmen, die sonst an Größenlimits von Serverfunktionen scheitern).
 */
export async function dateiHochladen(ziel: UploadZiel, datei: Blob, typ: string): Promise<void> {
  if (ziel.art === "demo") {
    const r = await fetch(ziel.url, { method: "PUT", body: datei, headers: { "content-type": typ || "application/octet-stream" } });
    if (!r.ok) throw new Error(`Hochladen fehlgeschlagen (${r.status})`);
    return;
  }
  const { supabaseBrowser } = await import("./supabase/browser");
  const { error } = await supabaseBrowser()
    .storage.from("dateien")
    .uploadToSignedUrl(ziel.pfad, ziel.token, datei, { contentType: typ || "application/octet-stream" });
  if (error) throw new Error(error.message);
}

/** Bestes verfügbares Aufnahmeformat: WebM/Opus (Chrome, Firefox, Android) oder MP4/AAC (Safari, iOS). */
export function aufnahmeFormat(): { mime: string; endung: string } {
  const kandidaten = [
    { mime: "audio/webm;codecs=opus", endung: "webm" },
    { mime: "audio/webm", endung: "webm" },
    { mime: "audio/mp4;codecs=mp4a.40.2", endung: "m4a" },
    { mime: "audio/mp4", endung: "m4a" },
    { mime: "audio/ogg;codecs=opus", endung: "ogg" },
  ];
  if (typeof MediaRecorder === "undefined") return { mime: "", endung: "webm" };
  return kandidaten.find((k) => MediaRecorder.isTypeSupported(k.mime)) ?? { mime: "", endung: "webm" };
}
