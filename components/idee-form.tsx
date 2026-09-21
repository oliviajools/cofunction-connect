"use client";

import { useRef, useTransition } from "react";
import { textErfassen } from "@/app/aktionen";

export function IdeeForm({ bereichId, privat }: { bereichId: string; privat: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  const [warten, starte] = useTransition();
  return (
    <form
      ref={ref}
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const titel = String(new FormData(e.currentTarget).get("titel") ?? "").trim();
        if (!titel) return;
        starte(async () => {
          await textErfassen({ titel, inhalt: "", art: "idee", bereichId, sichtbarkeit: privat ? "privat" : "team" });
          ref.current?.reset();
        });
      }}
    >
      <label htmlFor="neue-idee" className="sr-only">
        Neue Idee
      </label>
      <input id="neue-idee" name="titel" maxLength={300} placeholder="Idee festhalten …" className="feld !rounded-full flex-1" />
      <button type="submit" disabled={warten} className="knopf knopf-voll">
        Hinzufügen
      </button>
    </form>
  );
}
