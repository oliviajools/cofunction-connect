"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import {
  bausteinAnlegen,
  eintragLoeschen,
  eintragSpeichern,
  entknuepfen,
  erneutVerarbeiten,
  protokollPunktAnlegen,
  protokollPunktLoeschen,
  protokollPunktUmschalten,
  sichtbarkeitSetzen,
  tagEntfernen,
  tagHinzufuegen,
  verknuepfen,
  verknuepfungSuchen,
  zuordnen,
} from "@/app/aktionen";
import type { EintragTag, ProtokollPunkt, Segment, Sichtbarkeit } from "@/lib/data/types";
import { dauer } from "@/lib/format";
import { BereichAuswahl, type BereichOption } from "./zuordnen-form";
import { IconLink, IconMuell, IconPlus, IconSchloss, IconWiederholen, IconX } from "./icons";
import { AudioSpieler } from "./audio-spieler";
import { Markdown } from "./markdown";

// ───────────── Titel & Inhalt ─────────────

export function InhaltEditor({
  id,
  titel,
  inhalt,
  platzhalter,
  nurTitel = false,
}: {
  id: string;
  titel: string;
  inhalt: string;
  platzhalter?: string;
  /** Nur den Titel bearbeiten (z. B. Meetings – dort ist der Inhalt das Transkript) */
  nurTitel?: boolean;
}) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [warten, starte] = useTransition();
  const [fehler, setFehler] = useState("");

  if (!bearbeiten)
    return (
      <div>
        <div className="flex items-start gap-3">
          <h1 className="ueberschrift text-[32px] md:text-[46px] text-schiefer-tief flex-1 break-words">{titel || "Ohne Titel"}</h1>
          <button type="button" onClick={() => setBearbeiten(true)} className="knopf knopf-still shrink-0 mt-1">
            Bearbeiten
          </button>
        </div>
        {nurTitel ? null : inhalt ? (
          <div className="mt-5">
            <Markdown>{inhalt}</Markdown>
          </div>
        ) : (
          platzhalter && <p className="mt-5 text-[14px] text-leise">{platzhalter}</p>
        )}
      </div>
    );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        starte(async () => {
          const r = await eintragSpeichern(id, String(fd.get("titel") ?? ""), nurTitel ? inhalt : String(fd.get("inhalt") ?? ""));
          if (r.ok) setBearbeiten(false);
          else setFehler(r.fehler);
        });
      }}
    >
      <label className="block">
        <span className="text-[13px] font-semibold">Titel</span>
        <input name="titel" defaultValue={titel} maxLength={300} className="feld mt-1 !text-[18px]" />
      </label>
      {!nurTitel && (
        <label className="block">
          <span className="text-[13px] font-semibold">Inhalt</span>
          <textarea name="inhalt" defaultValue={inhalt} rows={Math.min(24, Math.max(8, inhalt.split("\n").length + 2))} className="feld mt-1 leading-relaxed" />
        </label>
      )}
      <p className="text-[12px] text-leise">Nach dem Speichern werden die Regel-Tags neu berechnet. Eigene Tags bleiben.</p>
      {fehler && <p className="text-[13px] text-signal">{fehler}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={warten} className="knopf knopf-voll">
          {warten ? "Speichert …" : "Speichern"}
        </button>
        <button type="button" onClick={() => setBearbeiten(false)} className="knopf knopf-still">
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// ───────────── Tags ─────────────

export function TagEditor({ id, tags }: { id: string; tags: EintragTag[] }) {
  const [warten, starte] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const quelleText = (t: EintragTag) => (t.quelle === "regel" ? `Regel „${t.regelWort}“` : t.quelle === "mail" ? "aus Betreff" : "von Hand");
  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <li key={t.name} className="tag !pr-1" title={quelleText(t)}>
            #{t.name}
            <span className="text-[11px] text-leise font-normal">{t.quelle === "regel" ? `← ${t.regelWort}` : t.quelle === "mail" ? "✉" : "✎"}</span>
            <button
              type="button"
              aria-label={`Tag ${t.name} entfernen`}
              disabled={warten}
              onClick={() => starte(async () => void (await tagEntfernen(id, t.name)))}
              className="ml-0.5 rounded-full p-0.5 hover:bg-nebel"
            >
              <IconX groesse={12} />
            </button>
          </li>
        ))}
        {tags.length === 0 && <li className="text-[13px] text-leise">Keine Tags. Keine Regel hat gegriffen.</li>}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = ref.current?.value.trim();
          if (!v) return;
          starte(async () => {
            await tagHinzufuegen(id, v);
            if (ref.current) ref.current.value = "";
          });
        }}
      >
        <label htmlFor={`tag-${id}`} className="sr-only">
          Tag hinzufügen
        </label>
        <input id={`tag-${id}`} ref={ref} placeholder="Tag von Hand …" maxLength={40} className="feld !min-h-10 !rounded-full !text-[14px] flex-1" />
        <button type="submit" disabled={warten} className="knopf knopf-rand !min-h-10" aria-label="Tag hinzufügen">
          <IconPlus groesse={16} />
        </button>
      </form>
      <p className="mt-2 text-[12px] text-leise">
        Entfernte Regel-Tags setzt das Regelwerk beim nächsten Speichern wieder, solange der Begriff vorkommt. Dauerhaft ändern: im{" "}
        <Link href="/regelwerk" className="underline">
          Regelwerk
        </Link>
        .
      </p>
    </div>
  );
}

// ───────────── Aktionen ─────────────

export function EintragAktionen({
  id,
  bereichId,
  sichtbarkeit,
  optionen,
  zurueck,
  kannVerarbeiten,
}: {
  id: string;
  bereichId: string | null;
  sichtbarkeit: Sichtbarkeit;
  optionen: BereichOption[];
  zurueck: string;
  kannVerarbeiten: boolean;
}) {
  const [ziel, setZiel] = useState(bereichId ?? "");
  const [warten, starte] = useTransition();
  const [loeschen, setLoeschen] = useState(false);
  const [meldung, setMeldung] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`bereich-${id}`} className="text-[13px] font-semibold">
          Bereich
        </label>
        <div className="mt-1 flex gap-2">
          <BereichAuswahl id={`bereich-${id}`} optionen={optionen} wert={ziel} onChange={setZiel} mitEingang />
          <button
            type="button"
            disabled={warten || ziel === (bereichId ?? "")}
            onClick={() =>
              starte(async () => {
                const r = await zuordnen(id, ziel || null);
                setMeldung(r.ok ? "Zuordnung gespeichert." : r.fehler);
              })
            }
            className="knopf knopf-voll"
          >
            OK
          </button>
        </div>
        {meldung && <p className="mt-1 text-[12px] text-leise">{meldung}</p>}
      </div>

      <label className="flex items-center gap-2.5 text-[14px] cursor-pointer">
        <input
          type="checkbox"
          checked={sichtbarkeit === "privat"}
          disabled={warten}
          onChange={(e) => starte(async () => void (await sichtbarkeitSetzen(id, e.target.checked ? "privat" : "team")))}
          className="h-4 w-4 accent-[var(--color-schiefer)]"
        />
        <IconSchloss groesse={15} className="text-leise" /> Nur für mich sichtbar
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        {kannVerarbeiten && (
          <button type="button" disabled={warten} onClick={() => starte(async () => void (await erneutVerarbeiten(id)))} className="knopf knopf-rand !min-h-10">
            <IconWiederholen groesse={16} /> Erneut verarbeiten
          </button>
        )}
        {!loeschen ? (
          <button type="button" onClick={() => setLoeschen(true)} className="knopf knopf-still !min-h-10 !text-signal">
            <IconMuell groesse={16} /> Löschen
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <button type="button" disabled={warten} onClick={() => starte(async () => eintragLoeschen(id, zurueck))} className="knopf !min-h-10 bg-signal text-white">
              Endgültig löschen
            </button>
            <button type="button" onClick={() => setLoeschen(false)} className="knopf knopf-still !min-h-10">
              Abbrechen
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

// ───────────── Verknüpfungen ─────────────

export function Verknuepfungen({ id, liste }: { id: string; liste: { id: string; titel: string; bereich: string }[] }) {
  const [q, setQ] = useState("");
  const [treffer, setTreffer] = useState<{ id: string; titel: string; bereich: string }[]>([]);
  const [warten, starte] = useTransition();
  const zeitgeber = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div>
      <ul className="space-y-1.5">
        {liste.map((v) => (
          <li key={v.id} className="flex items-center gap-2 text-[14px]">
            <IconLink groesse={15} className="text-leise shrink-0" />
            <Link href={`/eintrag/${v.id}`} className="flex-1 min-w-0 truncate hover:underline">
              {v.titel}
            </Link>
            <span className="text-[12px] text-leise shrink-0">{v.bereich}</span>
            <button
              type="button"
              aria-label="Verknüpfung lösen"
              onClick={() => starte(async () => void (await entknuepfen(id, v.id)))}
              className="rounded-full p-1 hover:bg-dunst"
            >
              <IconX groesse={13} />
            </button>
          </li>
        ))}
        {liste.length === 0 && <li className="text-[13px] text-leise">Noch keine Verknüpfungen.</li>}
      </ul>
      <div className="relative mt-3">
        <label htmlFor={`verkn-${id}`} className="sr-only">
          Eintrag zum Verknüpfen suchen
        </label>
        <input
          id={`verkn-${id}`}
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            if (zeitgeber.current) clearTimeout(zeitgeber.current);
            zeitgeber.current = setTimeout(async () => setTreffer(await verknuepfungSuchen(v, id)), 250);
          }}
          placeholder="Eintrag suchen und verknüpfen …"
          className="feld !min-h-10 !rounded-full !text-[14px]"
        />
        {treffer.length > 0 && q.length > 1 && (
          <ul className="absolute z-10 mt-1 w-full karte shadow-lg overflow-hidden">
            {treffer.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={warten}
                  onClick={() =>
                    starte(async () => {
                      await verknuepfen(id, t.id);
                      setQ("");
                      setTreffer([]);
                    })
                  }
                  className="w-full text-left px-4 py-2.5 text-[14px] hover:bg-grund flex gap-2"
                >
                  <span className="flex-1 truncate">{t.titel}</span>
                  <span className="text-[12px] text-leise">{t.bereich}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProtokollNeu({ eintragId, typ, platzhalter }: { eintragId: string; typ: "entscheidung" | "offen"; platzhalter: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [warten, starte] = useTransition();
  return (
    <form
      ref={ref}
      className="mt-2 flex flex-col sm:flex-row gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const text = String(fd.get("text") ?? "").trim();
        if (!text) return;
        starte(async () => {
          await protokollPunktAnlegen(eintragId, typ, text, String(fd.get("wer") ?? ""));
          ref.current?.reset();
        });
      }}
    >
      <label className="sr-only" htmlFor={`${typ}-${eintragId}`}>
        {platzhalter}
      </label>
      <input id={`${typ}-${eintragId}`} name="text" placeholder={platzhalter} className="feld !min-h-10 !text-[14px] flex-1" />
      {typ === "offen" && <input name="wer" placeholder="Wer?" aria-label="Verantwortlich" className="feld !min-h-10 !text-[14px] sm:!w-24" />}
      <button type="submit" disabled={warten} className="knopf knopf-rand !min-h-10" aria-label="Hinzufügen">
        <IconPlus groesse={16} />
      </button>
    </form>
  );
}

// ───────────── Meeting: Protokoll ─────────────

export function Protokoll({ eintragId, punkte: vomServer }: { eintragId: string; punkte: ProtokollPunkt[] }) {
  const [, starte] = useTransition();
  // Sofortige Rückmeldung beim Abhaken, bevor der Server antwortet
  const [punkte, abhaken] = useOptimistic(vomServer, (liste, a: { id: string; erledigt: boolean }) =>
    liste.map((p) => (p.id === a.id ? { ...p, erledigt: a.erledigt } : p)),
  );
  const entscheidungen = punkte.filter((p) => p.typ === "entscheidung");
  const offen = punkte.filter((p) => p.typ === "offen");

  return (
    <div className="space-y-7">
      <section>
        <h2 className="etikett">Entscheidungen</h2>
        <ol className="mt-2 space-y-1.5">
          {entscheidungen.map((p, i) => (
            <li key={p.id} className="group flex gap-2 text-[15px] leading-snug">
              <span className="text-leise tabular-nums">{i + 1}.</span>
              <span className="flex-1">{p.text}</span>
              <button
                type="button"
                aria-label="Entscheidung löschen"
                onClick={() => starte(async () => protokollPunktLoeschen(p.id))}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-full p-1 hover:bg-dunst"
              >
                <IconX groesse={13} />
              </button>
            </li>
          ))}
        </ol>
        <ProtokollNeu eintragId={eintragId} typ="entscheidung" platzhalter="Entscheidung festhalten …" />
      </section>
      <section>
        <h2 className="etikett">Offene Punkte · {offen.filter((p) => !p.erledigt).length}</h2>
        <ul className="mt-2 space-y-1">
          {offen.map((p) => (
            <li key={p.id} className="group flex items-center gap-3 min-h-10">
              <input
                type="checkbox"
                id={`pp-${p.id}`}
                checked={p.erledigt}
                onChange={(e) => {
                  const erledigt = e.target.checked;
                  starte(async () => {
                    abhaken({ id: p.id, erledigt });
                    await protokollPunktUmschalten(p.id, erledigt);
                  });
                }}
                className="h-[18px] w-[18px] accent-[var(--color-schiefer)]"
              />
              <label htmlFor={`pp-${p.id}`} className={`flex-1 text-[15px] cursor-pointer ${p.erledigt ? "line-through text-leise" : ""}`}>
                {p.text}
              </label>
              {p.verantwortlich && <span className="text-[12px] text-leise">{p.verantwortlich}</span>}
              <button
                type="button"
                aria-label="Punkt löschen"
                onClick={() => starte(async () => protokollPunktLoeschen(p.id))}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-full p-1 hover:bg-dunst"
              >
                <IconX groesse={13} />
              </button>
            </li>
          ))}
        </ul>
        <ProtokollNeu eintragId={eintragId} typ="offen" platzhalter="Offenen Punkt hinzufügen …" />
      </section>
    </div>
  );
}

// ───────────── Transkript mit Audio und Baustein aus Markierung ─────────────

export function Transkript({
  eintragId,
  segmente,
  audioUrl,
  bausteineErlaubt,
}: {
  eintragId: string;
  segmente: Segment[];
  audioUrl: string | null;
  bausteineErlaubt: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [zeit, setZeit] = useState(0);
  const [auswahl, setAuswahl] = useState<{ text: string; von?: number; bis?: number } | null>(null);
  const [titel, setTitel] = useState("");
  const [warten, starte] = useTransition();
  const [meldung, setMeldung] = useState("");
  const sprecher = [...new Set(segmente.map((s) => s.sprecher).filter(Boolean))] as string[];
  const farben = ["text-schiefer-dunkel", "text-sand-tinte", "text-[#3f6b5a]", "text-[#6a4d7a]"];

  function markierungPruefen() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!bausteineErlaubt || text.length < 8) return;
    const zeitVon = (n: Node | null | undefined) => {
      const el = (n instanceof Element ? n : n?.parentElement)?.closest("[data-start]");
      return el ? Number(el.getAttribute("data-start")) : undefined;
    };
    const zeitBis = (n: Node | null | undefined) => {
      const el = (n instanceof Element ? n : n?.parentElement)?.closest("[data-ende]");
      return el ? Number(el.getAttribute("data-ende")) : undefined;
    };
    setAuswahl({ text, von: zeitVon(sel?.anchorNode), bis: zeitBis(sel?.focusNode) });
    setTitel(text.split(/(?<=[.!?])\s/)[0].slice(0, 90));
    setMeldung("");
  }

  return (
    <div>
      {audioUrl && (
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur pb-3 mb-2">
          <AudioSpieler ref={audio} src={audioUrl} onTimeUpdate={setZeit} />
        </div>
      )}
      {auswahl && (
        <div className="mb-4 rounded-2xl border border-schiefer-hell bg-grund p-4 space-y-2">
          <p className="etikett">Wissensbaustein aus Markierung</p>
          <p className="text-[13px] text-leise line-clamp-3">„{auswahl.text}“</p>
          <label className="block">
            <span className="sr-only">Titel des Bausteins</span>
            <input value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Kurzer Titel" className="feld !min-h-10 !text-[14px]" />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={warten || !titel.trim()}
              onClick={() =>
                starte(async () => {
                  const r = await bausteinAnlegen(eintragId, titel, auswahl.text, auswahl.von, auswahl.bis);
                  if (r.ok) {
                    setAuswahl(null);
                    setMeldung("Baustein angelegt.");
                    window.getSelection()?.removeAllRanges();
                  } else setMeldung(r.fehler);
                })
              }
              className="knopf knopf-voll !min-h-10"
            >
              Als Baustein speichern
            </button>
            <button type="button" onClick={() => setAuswahl(null)} className="knopf knopf-still !min-h-10">
              Abbrechen
            </button>
          </div>
        </div>
      )}
      {meldung && <p className="mb-3 text-[13px] text-leise">{meldung}</p>}
      {bausteineErlaubt && !auswahl && <p className="mb-3 text-[12px] text-leise">Tipp: Text markieren, um einen Wissensbaustein daraus zu machen.</p>}
      <div className="space-y-4" onMouseUp={markierungPruefen} onTouchEnd={() => setTimeout(markierungPruefen, 50)}>
        {segmente.map((s, i) => {
          const aktiv = zeit >= s.start && zeit < (segmente[i + 1]?.start ?? s.ende + 1) && zeit > 0;
          return (
            <div key={i} className="flex gap-3" data-start={s.start} data-ende={s.ende}>
              <button
                type="button"
                onClick={() => {
                  if (audio.current) {
                    audio.current.currentTime = s.start;
                    void audio.current.play();
                  }
                }}
                disabled={!audioUrl}
                className={`w-14 shrink-0 self-start ${s.sprecher ? "pt-[19px]" : "pt-1"} text-left font-mono text-[12px] text-leise hover:text-schiefer-dunkel disabled:hover:text-leise`}
                aria-label={`Ab ${dauer(s.start)} abspielen`}
              >
                {dauer(s.start)}
              </button>
              <div className={`flex-1 rounded-xl px-3 py-1.5 -mx-3 -my-1.5 transition-colors ${aktiv ? "bg-dunst" : ""}`}>
                {s.sprecher && (
                  <span className={`block text-[12px] font-semibold ${farben[Math.max(0, sprecher.indexOf(s.sprecher)) % farben.length]}`}>{s.sprecher}</span>
                )}
                <span className="text-[15px] leading-relaxed">{s.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
