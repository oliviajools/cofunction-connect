"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Anmeldung per Einmal-Code aus der Mail. Funktioniert auch in der installierten
 * Handy-App (dort öffnen Mail-Links sonst den normalen Browser statt der App).
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [schritt, setSchritt] = useState<"mail" | "code">("mail");
  const [meldung, setMeldung] = useState("");
  const [warten, starte] = useTransition();

  return schritt === "mail" ? (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMeldung("");
        starte(async () => {
          const { error } = await supabaseBrowser().auth.signInWithOtp({
            email: email.trim().toLowerCase(),
            options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback` },
          });
          if (error) setMeldung(error.message.includes("Signups not allowed") ? "Diese Adresse ist nicht eingeladen." : error.message);
          else setSchritt("code");
        });
      }}
    >
      <label className="block">
        <span className="text-[13px] font-semibold">E-Mail-Adresse</span>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="feld mt-1" />
      </label>
      {meldung && <p className="text-[13px] text-signal">{meldung}</p>}
      <button type="submit" disabled={warten} className="knopf knopf-voll w-full">
        {warten ? "Wird gesendet …" : "Anmeldecode senden"}
      </button>
      <p className="text-[12px] text-leise">Nur für eingeladene Teammitglieder.</p>
    </form>
  ) : (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
        setMeldung("");
        starte(async () => {
          const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: "email" });
          if (error) setMeldung("Der Code stimmt nicht oder ist abgelaufen.");
          else {
            router.replace("/");
            router.refresh();
          }
        });
      }}
    >
      <p className="text-[14px]">
        Wir haben einen Code an <strong>{email}</strong> geschickt.
      </p>
      <label className="block">
        <span className="text-[13px] font-semibold">Code aus der Mail</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          className="feld mt-1 !text-[22px] tracking-[0.3em] text-center"
          maxLength={10}
        />
      </label>
      {meldung && <p className="text-[13px] text-signal">{meldung}</p>}
      <button type="submit" disabled={warten} className="knopf knopf-voll w-full">
        {warten ? "Prüfe …" : "Anmelden"}
      </button>
      <button type="button" onClick={() => setSchritt("mail")} className="knopf knopf-still w-full">
        Andere Adresse
      </button>
      <p className="text-[12px] text-leise">Du kannst auch einfach auf den Link in der Mail tippen.</p>
    </form>
  );
}
