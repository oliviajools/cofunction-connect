"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { hochgeladenAbschliessen, textErfassen, uploadStarten } from "@/app/aktionen";
import { aufnahmeFormat, dateiHochladen } from "@/lib/hochladen";
import { dauer } from "@/lib/format";
import { IconDatei, IconHaken, IconMeeting, IconMikro, IconText } from "./icons";

type Modus = "notiz" | "meeting" | "datei" | "text";
type Phase = "bereit" | "aufnahme" | "pause" | "hochladen" | "gespeichert" | "fehler";

export interface Ziel {
  id: string;
  name: string;
  art: string;
  privat: boolean;
}

const MODI: { id: Modus; text: string; Icon: typeof IconMikro }[] = [
  { id: "notiz", text: "Notiz", Icon: IconMikro },
  { id: "meeting", text: "Meeting", Icon: IconMeeting },
  { id: "datei", text: "Datei", Icon: IconDatei },
  { id: "text", text: "Text", Icon: IconText },
];

export function Erfasser({ ziele, startModus, vorauswahl }: { ziele: Ziel[]; startModus: Modus; vorauswahl: string | null }) {
  const [modus, setModus] = useState<Modus>(startModus);
  const [ziel, setZiel] = useState<string | null>(vorauswahl);
  const [privat, setPrivat] = useState(false);
  const [phase, setPhase] = useState<Phase>("bereit");
  const [sek, setSek] = useState(0);
  const [pegel, setPegel] = useState<number[]>(Array(28).fill(0.08));
  const [meldung, setMeldung] = useState<string>("");
  const [gespeichert, setGespeichert] = useState<{ id: string; text: string }[]>([]);
  const [warten, starte] = useTransition();

  const recorder = useRef<MediaRecorder | null>(null);
  const stuecke = useRef<Blob[]>([]);
  const strom = useRef<MediaStream | null>(null);
  const takt = useRef<ReturnType<typeof setInterval> | null>(null);
  const rahmen = useRef<number | null>(null);
  const wachhalter = useRef<{ release: () => Promise<void> } | null>(null);
  const letzteAufnahme = useRef<{ blob: Blob; name: string; typ: string; sek: number } | null>(null);
  const sekRef = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);

  const zielName = ziel ? (ziele.find((z) => z.id === ziel)?.name ?? "Bereich") : "Eingang";
  const zielPrivat = ziel ? !!ziele.find((z) => z.id === ziel)?.privat : false;
  // Handy: 3 Schnellwahl-Knöpfe, damit der Aufnahmeknopf ohne Scrollen sichtbar bleibt; Desktop: 6
  const schnell = ziele.slice(0, 6);
  const weitere = ziele.slice(3);

  useEffect(() => () => aufraeumen(), []);

  function aufraeumen() {
    if (takt.current) clearInterval(takt.current);
    if (rahmen.current) cancelAnimationFrame(rahmen.current);
    strom.current?.getTracks().forEach((t) => t.stop());
    wachhalter.current?.release().catch(() => {});
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    takt.current = null;
    rahmen.current = null;
    strom.current = null;
    wachhalter.current = null;
  }

  async function aufnahmeStarten() {
    setMeldung("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      strom.current = s;
      const fmt = aufnahmeFormat();
      const r = new MediaRecorder(s, { ...(fmt.mime ? { mimeType: fmt.mime } : {}), audioBitsPerSecond: modus === "meeting" ? 48000 : 32000 });
      stuecke.current = [];
      r.ondataavailable = (ev) => ev.data.size && stuecke.current.push(ev.data);
      r.onstop = async () => {
        const typ = r.mimeType || fmt.mime || "audio/webm";
        let blob = new Blob(stuecke.current, { type: typ });
        // Browser schreiben bei WebM keine Länge in die Datei – nachtragen, damit Player spulen können.
        if (typ.includes("webm")) {
          try {
            const { default: laengeNachtragen } = await import("fix-webm-duration");
            blob = await laengeNachtragen(blob, sekRef.current * 1000, { logger: false });
          } catch {
            /* Aufnahme bleibt trotzdem nutzbar */
          }
        }
        const endung = typ.includes("mp4") ? "m4a" : typ.includes("ogg") ? "ogg" : "webm";
        const stempel = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
        letzteAufnahme.current = { blob, name: `${modus === "meeting" ? "meeting" : "notiz"}-${stempel}.${endung}`, typ, sek: sekRef.current };
        aufraeumen();
        void hochladen();
      };
      r.start(1000);
      recorder.current = r;
      setSek(0);
      sekRef.current = 0;
      takt.current = setInterval(() => {
        sekRef.current += 1;
        setSek(sekRef.current);
      }, 1000);
      pegelMessen(s);
      // Bildschirm wach halten, damit lange Meetings nicht abbrechen
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
        wachhalter.current = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        /* nicht überall verfügbar */
      }
      setPhase("aufnahme");
    } catch (e) {
      setPhase("fehler");
      setMeldung(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Kein Zugriff aufs Mikrofon. Bitte in den Browser-Einstellungen erlauben."
          : "Aufnahme konnte nicht gestartet werden.",
      );
    }
  }

  function pegelMessen(s: MediaStream) {
    try {
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const quelle = ctx.createMediaStreamSource(s);
      const analyse = ctx.createAnalyser();
      analyse.fftSize = 256;
      quelle.connect(analyse);
      const puffer = new Uint8Array(analyse.frequencyBinCount);
      let letzte = 0;
      const schritt = (t: number) => {
        if (t - letzte > 90) {
          letzte = t;
          analyse.getByteTimeDomainData(puffer);
          let summe = 0;
          for (const v of puffer) summe += Math.abs(v - 128);
          const wert = Math.min(1, (summe / puffer.length) / 28 + 0.06);
          setPegel((alt) => [...alt.slice(1), wert]);
        }
        rahmen.current = requestAnimationFrame(schritt);
      };
      rahmen.current = requestAnimationFrame(schritt);
    } catch {
      /* Pegelanzeige ist nur Deko */
    }
  }

  function pausieren() {
    const r = recorder.current;
    if (!r) return;
    if (r.state === "recording") {
      r.pause();
      if (takt.current) clearInterval(takt.current);
      setPhase("pause");
    } else if (r.state === "paused") {
      r.resume();
      takt.current = setInterval(() => {
        sekRef.current += 1;
        setSek(sekRef.current);
      }, 1000);
      setPhase("aufnahme");
    }
  }

  function beenden() {
    setPhase("hochladen");
    recorder.current?.stop();
  }

  async function hochladen() {
    const a = letzteAufnahme.current;
    if (!a) return;
    setPhase("hochladen");
    try {
      const start = await uploadStarten(a.name);
      if (!start.ok || !start.daten) throw new Error(start.ok ? "Kein Upload-Ziel" : start.fehler);
      await dateiHochladen(start.daten, a.blob, a.typ);
      const fertig = await hochgeladenAbschliessen({
        pfad: start.daten.pfad,
        art: modus === "meeting" ? "meeting" : "sprache",
        dateiName: a.name,
        dateiTyp: a.typ,
        groesse: a.blob.size,
        dauer: a.sek,
        bereichId: ziel,
        sichtbarkeit: privat || zielPrivat ? "privat" : "team",
      });
      if (!fertig.ok || !fertig.daten) throw new Error(fertig.ok ? "Unbekannter Fehler" : fertig.fehler);
      letzteAufnahme.current = null;
      setGespeichert((g) => [{ id: fertig.daten!.id, text: `${modus === "meeting" ? "Meeting" : "Sprachnotiz"} · ${dauer(a.sek)} → ${zielName}` }, ...g]);
      setPhase("gespeichert");
    } catch (e) {
      setPhase("fehler");
      setMeldung(`Hochladen fehlgeschlagen: ${e instanceof Error ? e.message : e}. Die Aufnahme ist noch da.`);
    }
  }

  function aufnahmeSichern() {
    const a = letzteAufnahme.current;
    if (!a) return;
    const url = URL.createObjectURL(a.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = a.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function dateienHochladen(dateien: FileList | null, notiz: string) {
    if (!dateien?.length) return;
    setPhase("hochladen");
    setMeldung("");
    const neu: { id: string; text: string }[] = [];
    try {
      for (const d of Array.from(dateien)) {
        const start = await uploadStarten(d.name);
        if (!start.ok || !start.daten) throw new Error(start.ok ? "Kein Upload-Ziel" : start.fehler);
        await dateiHochladen(start.daten, d, d.type);
        const fertig = await hochgeladenAbschliessen({
          pfad: start.daten.pfad,
          art: "datei",
          dateiName: d.name,
          dateiTyp: d.type || "application/octet-stream",
          groesse: d.size,
          bereichId: ziel,
          sichtbarkeit: privat || zielPrivat ? "privat" : "team",
          notiz: notiz || undefined,
        });
        if (!fertig.ok || !fertig.daten) throw new Error(fertig.ok ? "Unbekannter Fehler" : fertig.fehler);
        neu.push({ id: fertig.daten.id, text: `${d.name} → ${zielName}` });
      }
      setGespeichert((g) => [...neu, ...g]);
      setPhase("gespeichert");
    } catch (e) {
      setGespeichert((g) => [...neu, ...g]);
      setPhase("fehler");
      setMeldung(`Hochladen fehlgeschlagen: ${e instanceof Error ? e.message : e}`);
    }
  }

  function textSpeichern(form: HTMLFormElement) {
    const fd = new FormData(form);
    starte(async () => {
      const r = await textErfassen({
        titel: String(fd.get("titel") ?? ""),
        inhalt: String(fd.get("inhalt") ?? ""),
        art: fd.get("idee") ? "idee" : "text",
        bereichId: ziel,
        sichtbarkeit: privat || zielPrivat ? "privat" : "team",
      });
      if (r.ok && r.daten) {
        setGespeichert((g) => [{ id: r.daten!.id, text: `Text → ${zielName}` }, ...g]);
        form.reset();
        setPhase("gespeichert");
      } else if (!r.ok) {
        setMeldung(r.fehler);
      }
    });
  }

  const laeuft = phase === "aufnahme" || phase === "pause" || phase === "hochladen";

  return (
    <div className="mx-auto max-w-xl">
      {/* Modus */}
      <div role="tablist" aria-label="Art der Erfassung" className="grid grid-cols-4 gap-1 rounded-full bg-dunst p-1">
        {MODI.map((m) => (
          <button
            key={m.id}
            role="tab"
            type="button"
            aria-selected={modus === m.id}
            disabled={laeuft}
            onClick={() => {
              setModus(m.id);
              setPhase("bereit");
              setMeldung("");
            }}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full text-[14px] font-medium transition-colors disabled:opacity-50 ${
              modus === m.id ? "bg-white text-schiefer-tief shadow-sm" : "text-leise"
            }`}
          >
            <m.Icon groesse={17} />
            <span>{m.text}</span>
          </button>
        ))}
      </div>

      {/* Ziel */}
      <section className="mt-5 sm:mt-7">
        <h2 className="font-sans text-[14px] font-semibold text-tinte">Wohin gehört das?</h2>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={laeuft}
            onClick={() => setZiel(null)}
            className={`min-h-11 rounded-full border px-4 text-[14px] font-medium ${
              ziel === null ? "border-schiefer bg-schiefer text-white" : "border-nebel bg-white"
            }`}
          >
            Eingang
          </button>
          {schnell.map((z, i) => (
            <button
              key={z.id}
              type="button"
              disabled={laeuft}
              onClick={() => setZiel(ziel === z.id ? null : z.id)}
              className={`min-h-11 rounded-full border px-4 text-[14px] font-medium ${i >= 3 ? "max-sm:hidden" : ""} ${
                ziel === z.id ? "border-schiefer bg-schiefer text-white" : "border-nebel bg-white"
              }`}
            >
              {z.name}
            </button>
          ))}
          {weitere.length > 0 && (
            <select
              aria-label="Weitere Bereiche"
              disabled={laeuft}
              value={weitere.some((w) => w.id === ziel) ? ziel! : ""}
              onChange={(e) => setZiel(e.target.value || null)}
              className="feld !w-auto !rounded-full !min-h-11"
            >
              <option value="">Weitere …</option>
              {weitere.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[13px] text-leise">
            {ziel ? "Direkt im Bereich abgelegt. Tags setzt das Regelwerk." : "Landet im Eingang und wird dort von Hand zugeordnet."}
          </p>
          <label className="flex items-center gap-2 text-[13px] text-leise shrink-0">
            <input
              type="checkbox"
              checked={privat || zielPrivat}
              disabled={zielPrivat || laeuft}
              onChange={(e) => setPrivat(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-schiefer)]"
            />
            Nur für mich
          </label>
        </div>
      </section>

      {/* Aufnahme */}
      {(modus === "notiz" || modus === "meeting") && (
        <section className="mt-6 sm:mt-8 flex flex-col items-center text-center" aria-live="polite">
          {phase === "bereit" && (
            <>
              <button
                type="button"
                onClick={aufnahmeStarten}
                aria-label="Aufnahme starten"
                className="flex h-32 w-32 sm:h-40 sm:w-40 items-center justify-center rounded-full bg-schiefer text-white ring-[12px] sm:ring-[14px] ring-dunst hover:bg-schiefer-dunkel transition-colors"
              >
                <IconMikro groesse={58} strokeWidth={1.4} />
              </button>
              <p className="mt-5 sm:mt-6 ueberschrift text-[26px] sm:text-[28px] text-schiefer-tief">{modus === "meeting" ? "Meeting aufnehmen" : "Tippen und sprechen"}</p>
              <p className="mt-2 max-w-sm text-[14px] text-leise">
                {modus === "meeting"
                  ? "Handy auf den Tisch legen. Im Transkript werden die Sprecher automatisch getrennt; das Protokoll schreibt ihr danach von Hand."
                  : "Kurz festhalten, was du gerade gelernt oder beobachtet hast."}
              </p>
            </>
          )}

          {(phase === "aufnahme" || phase === "pause") && (
            <>
              <span className={`etikett ${phase === "pause" ? "" : "!text-signal"}`}>{phase === "pause" ? "Pausiert" : "● Aufnahme läuft"}</span>
              <span className="mt-2 font-display text-[64px] font-light tabular-nums text-schiefer-tief">{dauer(sek)}</span>
              <div aria-hidden="true" className="mt-2 flex h-14 items-center gap-[5px]">
                {pegel.map((p, i) => (
                  <span key={i} className="w-[5px] rounded-full bg-schiefer transition-[height] duration-100" style={{ height: `${Math.round(p * 56)}px` }} />
                ))}
              </div>
              <p className="mt-3 text-[14px]">
                Ziel: <strong className="font-semibold">{zielName}</strong>
              </p>
              <div className="mt-6 flex items-center gap-4">
                {modus === "meeting" && (
                  <button type="button" onClick={pausieren} className="knopf knopf-rand !min-h-14 !px-6">
                    {phase === "pause" ? "Weiter" : "Pause"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={beenden}
                  aria-label="Aufnahme beenden und speichern"
                  className="flex h-24 w-24 items-center justify-center rounded-full bg-signal hover:opacity-90"
                >
                  <span className="h-8 w-8 rounded-md bg-white" />
                </button>
              </div>
            </>
          )}

          {phase === "hochladen" && (
            <div className="py-10">
              <div className="mx-auto h-12 w-12 rounded-full border-[3px] border-nebel border-t-schiefer animate-spin" />
              <p className="mt-4 text-[15px]">Wird gespeichert …</p>
              <p className="mt-1 text-[13px] text-leise">Bitte die Seite geöffnet lassen.</p>
            </div>
          )}

          {phase === "gespeichert" && (
            <Gespeichert
              eintrag={gespeichert[0]}
              hinweis="Die Transkription läuft im Hintergrund – Tags setzt danach das Regelwerk."
              weiter={() => setPhase("bereit")}
              weiterText="Neue Aufnahme"
            />
          )}

          {phase === "fehler" && (
            <div className="py-6 max-w-sm">
              <p className="text-[15px] text-signal">{meldung}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {letzteAufnahme.current ? (
                  <>
                    <button type="button" onClick={hochladen} className="knopf knopf-voll">
                      Erneut hochladen
                    </button>
                    <button type="button" onClick={aufnahmeSichern} className="knopf knopf-rand">
                      Aufnahme sichern
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setPhase("bereit")} className="knopf knopf-voll">
                    Zurück
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Datei */}
      {modus === "datei" && (
        <section className="mt-8">
          {phase === "gespeichert" ? (
            <Gespeichert eintrag={gespeichert[0]} hinweis="Texte aus PDFs werden ausgelesen und durchsuchbar." weiter={() => setPhase("bereit")} weiterText="Weitere Dateien" />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.currentTarget;
                void dateienHochladen((f.elements.namedItem("dateien") as HTMLInputElement).files, String(new FormData(f).get("notiz") ?? ""));
              }}
              className="space-y-4"
            >
              <label className="flex flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-nebel bg-white px-6 py-10 text-center cursor-pointer hover:border-schiefer-hell">
                <IconDatei groesse={32} className="text-schiefer" />
                <span className="font-medium">Dateien auswählen</span>
                <span className="text-[13px] text-leise">PDF, Folien, Fotos, Audio – mehrere möglich</span>
                <input name="dateien" type="file" multiple required className="text-[13px] mt-2 max-w-full" />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium">Notiz dazu (optional)</span>
                <textarea name="notiz" rows={3} className="feld mt-1" placeholder="Worum geht es?" />
              </label>
              {meldung && <p className="text-[14px] text-signal">{meldung}</p>}
              <button type="submit" disabled={phase === "hochladen"} className="knopf knopf-voll w-full">
                {phase === "hochladen" ? "Wird hochgeladen …" : `Hochladen → ${zielName}`}
              </button>
            </form>
          )}
        </section>
      )}

      {/* Text */}
      {modus === "text" && (
        <section className="mt-8">
          {phase === "gespeichert" ? (
            <Gespeichert eintrag={gespeichert[0]} hinweis="Tags wurden über das Regelwerk gesetzt." weiter={() => setPhase("bereit")} weiterText="Noch etwas notieren" />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                textSpeichern(e.currentTarget);
              }}
              className="space-y-4"
            >
              <label className="block">
                <span className="text-[13px] font-medium">Titel</span>
                <input name="titel" className="feld mt-1" placeholder="Wird sonst aus dem ersten Satz gebildet" maxLength={300} />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium">Inhalt</span>
                <textarea name="inhalt" rows={8} className="feld mt-1" placeholder="Was möchtest du festhalten?" />
              </label>
              <label className="flex items-center gap-2 text-[14px]">
                <input type="checkbox" name="idee" className="h-4 w-4 accent-[var(--color-schiefer)]" /> Als Idee in den Brainstorm
              </label>
              {meldung && <p className="text-[14px] text-signal">{meldung}</p>}
              <button type="submit" disabled={warten} className="knopf knopf-voll w-full">
                {warten ? "Wird gespeichert …" : `Speichern → ${zielName}`}
              </button>
            </form>
          )}
        </section>
      )}

      {gespeichert.length > 1 && (
        <section className="mt-10">
          <h2 className="etikett">In dieser Sitzung</h2>
          <ul className="mt-2 text-[14px]">
            {gespeichert.slice(1).map((g) => (
              <li key={g.id} className="border-t border-linie py-2">
                <Link href={`/eintrag/${g.id}`} className="hover:underline">
                  {g.text}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Gespeichert({
  eintrag,
  hinweis,
  weiter,
  weiterText,
}: {
  eintrag?: { id: string; text: string };
  hinweis: string;
  weiter: () => void;
  weiterText: string;
}) {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <span className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-schiefer text-schiefer">
        <IconHaken groesse={38} strokeWidth={2} />
      </span>
      <p className="mt-4 ueberschrift text-[28px] text-schiefer-tief">Gespeichert</p>
      {eintrag && <p className="mt-1 text-[15px]">{eintrag.text}</p>}
      <p className="mt-2 max-w-sm text-[13px] text-leise">{hinweis}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={weiter} className="knopf knopf-voll">
          {weiterText}
        </button>
        {eintrag && (
          <Link href={`/eintrag/${eintrag.id}`} className="knopf knopf-rand">
            Ansehen
          </Link>
        )}
      </div>
    </div>
  );
}
