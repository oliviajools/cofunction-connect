// Transkription über Mistral Voxtral – die einzige ML-Komponente in Version 1.
// Sie trifft keine Entscheidung, sondern wandelt Sprache in Text. Das Ergebnis ist
// sichtbar und editierbar.

import { mistralModell, mistralSchluessel } from "./config";
import type { Segment } from "./data/types";

const ENDPUNKT = "https://api.mistral.ai/v1/audio/transcriptions";

export interface TranskriptErgebnis {
  text: string;
  segmente: Segment[];
  sprache: string | null;
  sekunden: number | null;
}

export class TranskriptionNichtKonfiguriert extends Error {
  constructor() {
    super("Kein MISTRAL_API_KEY gesetzt – Aufnahme gespeichert, aber nicht transkribiert.");
  }
}

interface RohSegment {
  text?: string;
  start?: number;
  end?: number;
  speaker_id?: string | number | null;
  speaker?: string | number | null;
}

/** Sprecher-IDs („speaker_0“, 1, …) in lesbare, stabile Namen übersetzen: Sprecher 1, Sprecher 2 … */
export function segmenteUebersetzen(roh: RohSegment[] | undefined): Segment[] {
  if (!roh?.length) return [];
  const namen = new Map<string, string>();
  const segmente: Segment[] = [];
  for (const s of roh) {
    const text = (s.text ?? "").trim();
    if (!text) continue;
    const id = s.speaker_id ?? s.speaker;
    let sprecher: string | null = null;
    if (id !== undefined && id !== null && id !== "") {
      const key = String(id);
      if (!namen.has(key)) namen.set(key, `Sprecher ${namen.size + 1}`);
      sprecher = namen.get(key)!;
    }
    const letzte = segmente[segmente.length - 1];
    // Aufeinanderfolgende Stücke derselben Person zusammenfassen – liest sich besser.
    if (letzte && letzte.sprecher === sprecher && sprecher !== null && (s.start ?? 0) - letzte.ende < 2) {
      letzte.text = `${letzte.text} ${text}`;
      letzte.ende = s.end ?? letzte.ende;
    } else {
      segmente.push({ sprecher, start: s.start ?? 0, ende: s.end ?? s.start ?? 0, text });
    }
  }
  return segmente;
}

/** Fließtext aus Segmenten; mit Sprechernamen, wenn mehrere Personen sprechen. */
export function segmenteAlsText(segmente: Segment[]): string {
  const mehrere = new Set(segmente.map((s) => s.sprecher).filter(Boolean)).size > 1;
  return segmente.map((s) => (mehrere && s.sprecher ? `${s.sprecher}: ${s.text}` : s.text)).join("\n\n");
}

export async function transkribiere(opts: {
  /** Öffentlich/signiert erreichbare URL der Audiodatei (bevorzugt, spart Datenübertragung) */
  dateiUrl?: string | null;
  /** Alternativ: die Bytes selbst */
  daten?: Uint8Array | null;
  dateiName?: string;
  sprecherTrennen?: boolean;
  fachvokabular?: string[];
}): Promise<TranskriptErgebnis> {
  const schluessel = mistralSchluessel();
  if (!schluessel) throw new TranskriptionNichtKonfiguriert();

  const sprecher = opts.sprecherTrennen ?? true;
  let antwort: Response;

  if (opts.dateiUrl && /^https:\/\//.test(opts.dateiUrl)) {
    antwort = await fetch(ENDPUNKT, {
      method: "POST",
      headers: { Authorization: `Bearer ${schluessel}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: mistralModell(),
        file_url: opts.dateiUrl,
        diarize: sprecher,
        timestamp_granularities: ["segment"],
        ...(opts.fachvokabular?.length ? { context_bias: opts.fachvokabular.slice(0, 100) } : {}),
      }),
    });
  } else if (opts.daten) {
    const form = new FormData();
    form.append("model", mistralModell());
    form.append("file", new Blob([opts.daten as BlobPart]), opts.dateiName ?? "aufnahme.webm");
    form.append("diarize", String(sprecher));
    form.append("timestamp_granularities", "segment");
    antwort = await fetch(ENDPUNKT, { method: "POST", headers: { Authorization: `Bearer ${schluessel}` }, body: form });
  } else {
    throw new Error("Keine Audiodaten für die Transkription.");
  }

  if (!antwort.ok) {
    const text = await antwort.text().catch(() => "");
    throw new Error(`Transkription fehlgeschlagen (${antwort.status}): ${text.slice(0, 300)}`);
  }
  const json = (await antwort.json()) as {
    text?: string;
    language?: string | null;
    segments?: RohSegment[];
    usage?: { prompt_audio_seconds?: number };
  };
  let segmente = segmenteUebersetzen(json.segments);
  if (!segmente.length && json.text) segmente = [{ sprecher: null, start: 0, ende: 0, text: json.text.trim() }];
  return {
    text: segmente.length ? segmenteAlsText(segmente) : (json.text ?? "").trim(),
    segmente,
    sprache: json.language ?? null,
    sekunden: json.usage?.prompt_audio_seconds ?? null,
  };
}
