"use client";

import { useState, useTransition } from "react";
import { bereichAktualisieren } from "@/app/aktionen";
import type { BereichArt } from "@/lib/data/types";

export function BereichBearbeiten({
  bereich,
}: {
  bereich: { id: string; name: string; beschreibung: string; art: BereichArt; aktiv: boolean };
}) {
  const [offen, setOffen] = useState(false);
  const [warten, starte] = useTransition();

  if (!offen)
    return (
      <button type="button" onClick={() => setOffen(true)} className="knopf knopf-still">
        Bearbeiten
      </button>
    );

  return (
    <div role="dialog" aria-modal="true" aria-label="Bereich bearbeiten" className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-schiefer-tief/40 p-4">
      <form
        className="karte w-full max-w-md p-6 space-y-4 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          starte(async () => {
            await bereichAktualisieren(bereich.id, {
              name: String(fd.get("name")),
              beschreibung: String(fd.get("beschreibung") ?? ""),
              art: String(fd.get("art")) as BereichArt,
              aktiv: fd.get("aktiv") === "on",
            });
            setOffen(false);
          });
        }}
      >
        <h2 className="text-[22px] font-light">Bereich bearbeiten</h2>
        <label className="block">
          <span className="text-[13px] font-semibold">Name</span>
          <input name="name" defaultValue={bereich.name} required maxLength={120} className="feld mt-1" />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">Art</span>
          <select name="art" defaultValue={bereich.art} className="feld mt-1">
            <option value="projekt">Projekt</option>
            <option value="area">Area</option>
            <option value="ressource">Ressource</option>
            <option value="archiv">Archiv</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">Beschreibung</span>
          <textarea name="beschreibung" defaultValue={bereich.beschreibung} rows={3} maxLength={2000} className="feld mt-1" />
        </label>
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="aktiv" defaultChecked={bereich.aktiv} className="h-4 w-4 accent-[var(--color-schiefer)]" />
          Aktiv (abgeschlossene Projekte erscheinen im Archiv)
        </label>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={() => setOffen(false)} className="knopf knopf-still">
            Abbrechen
          </button>
          <button type="submit" disabled={warten} className="knopf knopf-voll">
            {warten ? "Speichert …" : "Speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
