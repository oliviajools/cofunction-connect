"use client";

import { useState, useTransition } from "react";
import { personEinladen } from "@/app/aktionen";
import { IconPlus } from "@/components/icons";

export function PersonEinladen() {
  const [warten, starte] = useTransition();
  const [meldung, setMeldung] = useState("");
  const [erfolg, setErfolg] = useState(false);

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        starte(async () => {
          const r = await personEinladen(new FormData(form));
          if (r.ok) {
            setErfolg(true);
            setMeldung("");
            form.reset();
          } else {
            setErfolg(false);
            setMeldung(r.fehler);
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] font-semibold">E-Mail</span>
          <input
            name="email"
            type="email"
            required
            placeholder="name@beispiel.de"
            className="feld mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">Name (optional)</span>
          <input
            name="name"
            maxLength={120}
            placeholder="Vorname Nachname"
            className="feld mt-1"
          />
        </label>
      </div>
      {meldung && <p className="text-[13px] text-signal">{meldung}</p>}
      {erfolg && <p className="text-[13px] text-[#3f7a5a]">Einladung verschickt.</p>}
      <button type="submit" disabled={warten} className="knopf knopf-voll">
        <IconPlus groesse={16} /> {warten ? "Lädt …" : "Einladen"}
      </button>
    </form>
  );
}
