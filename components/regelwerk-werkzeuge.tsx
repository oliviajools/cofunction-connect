"use client";

import { useMemo, useState, useTransition } from "react";
import { regelAnlegen, regelBearbeiten, regelLoeschen, regelnNeuAnwenden, regelUmschalten } from "@/app/aktionen";
import type { Regel } from "@/lib/data/types";
import { wendeRegelnAn } from "@/lib/regeln";
import { IconMuell, IconPlus, IconWiederholen } from "./icons";

export function RegelListe({ regeln }: { regeln: Regel[] }) {
  return (
    <ul>
      {regeln.map((r) => (
        <RegelZeile key={r.id} regel={r} />
      ))}
      {regeln.length === 0 && <li className="py-3 text-sm text-leise">Noch keine Regeln.</li>}
    </ul>
  );
}

function RegelZeile({ regel }: { regel: Regel }) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [warten, starte] = useTransition();
  const [fehler, setFehler] = useState("");

  if (bearbeiten)
    return (
      <li className="border-t border-linie first:border-t-0 py-3">
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            starte(async () => {
              const r = await regelBearbeiten(regel.id, String(fd.get("begriffe")), String(fd.get("tag")));
              if (r.ok) setBearbeiten(false);
              else setFehler(r.fehler);
            });
          }}
        >
          <input name="begriffe" defaultValue={regel.begriffe.join(", ")} aria-label="Begriffe" className="feld !min-h-10 !text-[14px] flex-1" />
          <input name="tag" defaultValue={regel.tag} aria-label="Tag" className="feld !min-h-10 !text-[14px] sm:!w-44" />
          <button type="submit" disabled={warten} className="knopf knopf-voll !min-h-10">
            Speichern
          </button>
          <button type="button" onClick={() => setBearbeiten(false)} className="knopf knopf-still !min-h-10">
            Abbrechen
          </button>
        </form>
        {fehler && <p className="mt-1 text-[12px] text-signal">{fehler}</p>}
      </li>
    );

  return (
    <li className={`group border-t border-linie first:border-t-0 py-3 flex items-center gap-3 ${regel.aktiv ? "" : "opacity-55"}`}>
      <input
        type="checkbox"
        checked={regel.aktiv}
        disabled={warten}
        aria-label={`Regel für #${regel.tag} ${regel.aktiv ? "deaktivieren" : "aktivieren"}`}
        onChange={(e) => starte(async () => regelUmschalten(regel.id, e.target.checked))}
        className="h-4 w-4 accent-[var(--color-schiefer)]"
      />
      <button type="button" onClick={() => setBearbeiten(true)} className="flex-1 min-w-0 text-left text-[15px] hover:underline decoration-nebel underline-offset-2">
        {regel.begriffe.join(", ")}
      </button>
      <span className="text-leise text-[13px]">→</span>
      <span className="tag">#{regel.tag}</span>
      <button
        type="button"
        aria-label={`Regel für #${regel.tag} löschen`}
        disabled={warten}
        onClick={() => starte(async () => regelLoeschen(regel.id))}
        className="rounded-full p-1.5 text-leise hover:text-signal hover:bg-dunst opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <IconMuell groesse={16} />
      </button>
    </li>
  );
}

export function NeueRegel() {
  const [warten, starte] = useTransition();
  const [meldung, setMeldung] = useState("");
  return (
    <form
      className="flex flex-col sm:flex-row sm:flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const fd = new FormData(f);
        starte(async () => {
          const r = await regelAnlegen(String(fd.get("begriffe")), String(fd.get("tag")));
          if (r.ok) {
            f.reset();
            setMeldung("Regel angelegt. Für bestehende Einträge „Neu anwenden“ nutzen.");
          } else setMeldung(r.fehler);
        });
      }}
    >
      <label className="flex-1 min-w-0">
        <span className="sr-only">Begriffe</span>
        <input name="begriffe" required placeholder="Wenn der Text enthält … (mehrere mit Komma)" className="feld !min-h-11 !text-[14px]" />
      </label>
      <label className="sm:w-44">
        <span className="sr-only">Tag</span>
        <input name="tag" required placeholder="dann Tag" className="feld !min-h-11 !text-[14px]" />
      </label>
      <button type="submit" disabled={warten} className="knopf knopf-voll">
        <IconPlus groesse={16} /> Regel
      </button>
      {meldung && <p className="w-full text-[12px] text-leise">{meldung}</p>}
    </form>
  );
}

export function NeuAnwenden() {
  const [warten, starte] = useTransition();
  const [meldung, setMeldung] = useState("");
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={warten}
        onClick={() =>
          starte(async () => {
            const r = await regelnNeuAnwenden();
            setMeldung(r.ok ? `${r.daten?.anzahl ?? 0} Einträge neu verschlagwortet.` : "Fehlgeschlagen.");
          })
        }
        className="knopf knopf-rand"
      >
        <IconWiederholen groesse={16} /> {warten ? "Läuft …" : "Auf alle Einträge neu anwenden"}
      </button>
      {meldung && <span className="text-[13px] text-leise">{meldung}</span>}
    </div>
  );
}

export function RegelTester({ regeln }: { regeln: Regel[] }) {
  const [text, setText] = useState("Nach der Sprungserie bei den Hockey-Spielerinnen mehr Ausweichbewegung im Knie, vermutlich Ermüdung.");
  const treffer = useMemo(() => wendeRegelnAn(text, regeln), [text, regeln]);
  return (
    <div>
      <label htmlFor="probe" className="text-[13px] text-leise">
        Text eingeben – bei gleichem Text ist das Ergebnis immer gleich.
      </label>
      <textarea id="probe" value={text} onChange={(e) => setText(e.target.value)} rows={4} className="feld mt-2 leading-relaxed" />
      <div className="mt-3 flex flex-wrap items-center gap-2 min-h-8">
        <span className="text-[13px] text-leise">Ergebnis:</span>
        {treffer.map((t) => (
          <span key={t.tag} className="tag">
            #{t.tag} <span className="text-leise font-normal">← „{t.wort}“</span>
          </span>
        ))}
        {treffer.length === 0 && <span className="text-[13px] text-sand-tinte">Keine Regel greift → Eingang, händisch zuordnen</span>}
      </div>
    </div>
  );
}
