import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoRepo, demoZuruecksetzen } from "@/lib/data/demo-repo";
import { automatischerTitel, verarbeiteEintrag } from "@/lib/pipeline";
import { segmenteAlsText, segmenteUebersetzen } from "@/lib/transkription";

describe("Pipeline", () => {
  beforeEach(() => {
    demoZuruecksetzen();
    vi.unstubAllEnvs();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("bildet Titel deterministisch", () => {
    expect(automatischerTitel("Das Knie war auffällig. Danach mehr.", "sprache")).toBe("Das Knie war auffällig");
    expect(automatischerTitel("", "meeting", new Date("2026-09-21T12:12:00Z"))).toBe("Meeting vom 21.09., 14:12");
  });

  it("ohne Mistral-Schlüssel: Aufnahme bleibt, Status „ohne_transkription“", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "");
    const repo = new DemoRepo();
    await repo.dateiSpeichern("u-olivia/2026/a.webm", new Uint8Array([1, 2, 3]), "audio/webm");
    const e = await repo.eintragAnlegen({ art: "sprache", titel: "x", audioPfad: "u-olivia/2026/a.webm", status: "verarbeitung" });
    await verarbeiteEintrag(repo, e.id);
    expect((await repo.eintrag(e.id))?.status).toBe("ohne_transkription");
  });

  it("transkribiert mit Sprechertrennung, setzt Titel und Regel-Tags", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "test");
    const aufrufe: { url: string; body: unknown }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        aufrufe.push({ url, body: init.body });
        return new Response(
          JSON.stringify({
            text: "…",
            language: "de",
            segments: [
              { text: "Die Belastung im Hockey steigt.", start: 0, end: 3, speaker_id: "speaker_a" },
              { text: "Ja, besonders am Knie.", start: 3.2, end: 5, speaker_id: "speaker_b" },
              { text: "Das sehen wir uns an.", start: 5.1, end: 7, speaker_id: "speaker_a" },
            ],
            usage: { prompt_audio_seconds: 7 },
          }),
          { status: 200 },
        );
      }),
    );
    const repo = new DemoRepo();
    await repo.dateiSpeichern("u-olivia/2026/m.webm", new Uint8Array([1]), "audio/webm");
    const e = await repo.eintragAnlegen({
      art: "meeting",
      titel: "Meeting vom …",
      audioPfad: "u-olivia/2026/m.webm",
      dateiName: "m.webm",
      status: "verarbeitung",
      meta: { titelAutomatisch: true },
    });
    await verarbeiteEintrag(repo, e.id);
    const fertig = await repo.eintrag(e.id);
    expect(aufrufe[0].url).toBe("https://api.mistral.ai/v1/audio/transcriptions");
    expect(aufrufe[0].body).toBeInstanceOf(FormData);
    expect(fertig?.status).toBe("bereit");
    expect(fertig?.transkript?.map((s) => s.sprecher)).toEqual(["Sprecher 1", "Sprecher 2", "Sprecher 1"]);
    expect(fertig?.titel).toBe("Die Belastung im Hockey steigt");
    expect(fertig?.tags.map((t) => t.name)).toEqual(["belastung", "hockey", "knie"]);
    expect(fertig?.meta.dauer).toBe(7);
  });

  it("merkt sich Fehler am Eintrag", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("kaputt", { status: 500 })));
    const repo = new DemoRepo();
    await repo.dateiSpeichern("u-olivia/2026/b.webm", new Uint8Array([1]), "audio/webm");
    const e = await repo.eintragAnlegen({ art: "sprache", titel: "x", audioPfad: "u-olivia/2026/b.webm", status: "verarbeitung" });
    await verarbeiteEintrag(repo, e.id);
    const f = await repo.eintrag(e.id);
    expect(f?.status).toBe("fehler");
    expect(f?.fehler).toContain("500");
    expect(f?.meta.versuche).toBe(1);
  });

  it("liest Text aus Klartext-Dateien und verschlagwortet", async () => {
    const repo = new DemoRepo();
    await repo.dateiSpeichern("u-olivia/2026/n.txt", new TextEncoder().encode("Notizen zur Propriozeption im Jugendalter"), "text/plain");
    const e = await repo.eintragAnlegen({ art: "datei", titel: "n.txt", dateiPfad: "u-olivia/2026/n.txt", dateiName: "n.txt", dateiTyp: "text/plain", status: "verarbeitung" });
    await verarbeiteEintrag(repo, e.id);
    const f = await repo.eintrag(e.id);
    expect(f?.inhalt).toContain("Propriozeption");
    expect(f?.tags.map((t) => t.name)).toEqual(["kinder-jugend", "propriozeption"]);
  });

  it("fasst Segmente derselben Person zusammen", () => {
    const s = segmenteUebersetzen([
      { text: "Hallo", start: 0, end: 1, speaker_id: 0 },
      { text: "zusammen.", start: 1.2, end: 2, speaker_id: 0 },
      { text: "Hi.", start: 2.5, end: 3, speaker_id: 1 },
    ]);
    expect(s).toHaveLength(2);
    expect(segmenteAlsText(s)).toBe("Sprecher 1: Hallo zusammen.\n\nSprecher 2: Hi.");
  });
});
