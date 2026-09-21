"use client";

export default function Fehler({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="karte p-8 max-w-xl mx-auto text-center">
      <p className="ueberschrift text-3xl text-schiefer-tief">Da ist etwas schiefgelaufen.</p>
      <p className="mt-3 text-[14px] text-leise">{error.message || "Unbekannter Fehler"}</p>
      <button onClick={reset} className="knopf knopf-voll mt-6">
        Nochmal versuchen
      </button>
    </div>
  );
}
