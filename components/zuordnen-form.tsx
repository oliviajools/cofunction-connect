"use client";

import { useState, useTransition } from "react";
import { zuordnen } from "@/app/aktionen";
import { BEREICH_MEHRZAHL } from "@/lib/format";
import type { BereichArt } from "@/lib/data/types";

export interface BereichOption {
  id: string;
  name: string;
  art: BereichArt;
}

export function BereichAuswahl({
  optionen,
  wert,
  onChange,
  id,
  mitEingang = false,
}: {
  optionen: BereichOption[];
  wert: string;
  onChange: (v: string) => void;
  id?: string;
  mitEingang?: boolean;
}) {
  const gruppen: BereichArt[] = ["projekt", "area", "ressource", "archiv"];
  return (
    <select id={id} value={wert} onChange={(e) => onChange(e.target.value)} className="feld">
      <option value="">{mitEingang ? "Eingang (nicht zugeordnet)" : "Bitte wählen …"}</option>
      {gruppen.map((g) => {
        const liste = optionen.filter((o) => o.art === g);
        if (!liste.length) return null;
        return (
          <optgroup key={g} label={BEREICH_MEHRZAHL[g]}>
            {liste.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

/** Händische Zuordnung eines Eintrags aus dem Eingang. */
export function ZuordnenForm({ eintragId, optionen }: { eintragId: string; optionen: BereichOption[] }) {
  const [wert, setWert] = useState("");
  const [meldung, setMeldung] = useState("");
  const [warten, starte] = useTransition();
  const feldId = `ziel-${eintragId}`;

  return (
    <div className="flex flex-col gap-2 w-full md:w-72 shrink-0">
      <label htmlFor={feldId} className="text-[13px] font-semibold">
        Zuordnen zu
      </label>
      <BereichAuswahl id={feldId} optionen={optionen} wert={wert} onChange={setWert} />
      <button
        type="button"
        disabled={warten}
        onClick={() => {
          if (!wert) {
            setMeldung("Bitte zuerst ein Ziel wählen.");
            return;
          }
          setMeldung("");
          starte(async () => {
            const r = await zuordnen(eintragId, wert);
            if (!r.ok) setMeldung(r.fehler);
          });
        }}
        className="knopf knopf-voll"
      >
        {warten ? "Wird zugeordnet …" : "Zuordnen"}
      </button>
      {meldung && <p className="text-[13px] text-signal">{meldung}</p>}
    </div>
  );
}
