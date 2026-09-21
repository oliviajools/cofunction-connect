// Text aus Dateien gewinnen, damit sie durchsuchbar sind und das Regelwerk greifen kann.
// Deterministisch: PDF-Text und Klartext. Andere Formate werden nur gespeichert.

export function istAudio(typ: string | null | undefined, name?: string | null): boolean {
  return !!typ?.startsWith("audio/") || !!typ?.startsWith("video/") || /\.(m4a|mp3|wav|webm|ogg|aac|mp4|mov)$/i.test(name ?? "");
}

export function istPdf(typ: string | null | undefined, name?: string | null): boolean {
  return typ === "application/pdf" || /\.pdf$/i.test(name ?? "");
}

export function istText(typ: string | null | undefined, name?: string | null): boolean {
  return !!typ?.startsWith("text/") || /\.(txt|md|csv)$/i.test(name ?? "");
}

const MAX_ZEICHEN = 200_000;

export async function textAusDatei(daten: Uint8Array, typ: string | null, name: string | null): Promise<string | null> {
  if (istPdf(typ, name)) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(daten));
    const { text } = await extractText(pdf, { mergePages: true });
    return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_ZEICHEN);
  }
  if (istText(typ, name)) {
    return new TextDecoder("utf-8").decode(daten).trim().slice(0, MAX_ZEICHEN);
  }
  return null;
}
