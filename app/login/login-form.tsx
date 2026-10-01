"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Anmeldung mit E-Mail-Adresse und Passwort.
 */
export function LoginForm() {
  const router = useRouter();
  const [meldung, setMeldung] = useState("");
  const [warten, starte] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const daten = new FormData(e.currentTarget);
        setMeldung("");
        starte(async () => {
          const { error } = await supabaseBrowser().auth.signInWithPassword({
            email: String(daten.get("email") ?? "").trim().toLowerCase(),
            password: String(daten.get("passwort") ?? ""),
          });
          if (error) setMeldung("E-Mail-Adresse oder Passwort ist falsch.");
          else {
            router.replace("/");
            router.refresh();
          }
        });
      }}
    >
      <label className="block">
        <span className="text-[13px] font-semibold">E-Mail-Adresse</span>
        <input name="email" type="email" required autoComplete="email" className="feld mt-1" />
      </label>
      <label className="block">
        <span className="text-[13px] font-semibold">Passwort</span>
        <input name="passwort" type="password" required autoComplete="current-password" className="feld mt-1" />
      </label>
      {meldung && <p className="text-[13px] text-signal">{meldung}</p>}
      <button type="submit" disabled={warten} className="knopf knopf-voll w-full">
        {warten ? "Wird angemeldet …" : "Anmelden"}
      </button>
      <p className="text-[12px] text-leise">Nur für eingerichtete Teammitglieder.</p>
    </form>
  );
}
