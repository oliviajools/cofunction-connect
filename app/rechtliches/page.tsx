import Link from "next/link";

export const metadata = { title: "Rechtliches" };

export default function Rechtliches() {
  return (
    <main className="min-h-dvh bg-grund px-5 py-10 md:py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link href="/login" className="text-[14px] text-schiefer-dunkel hover:underline">
          Zurück zur Anmeldung
        </Link>

        <section>
          <h1 className="ueberschrift text-[32px] md:text-[44px] text-schiefer-tief mb-3">Impressum</h1>
          <p className="text-[14px] text-leise mb-6">Diese Angaben müssen vor dem öffentlichen Betrieb durch den Betreiber ausgefüllt werden.</p>
          <div className="karte p-5 md:p-7 space-y-4 text-[15px]">
            <p>
              <strong className="font-semibold">Betreiber:</strong> [Name des Unternehmens / der Person]
            </p>
            <p>
              <strong className="font-semibold">Anschrift:</strong> [Straße, PLZ, Ort]
            </p>
            <p>
              <strong className="font-semibold">Kontakt:</strong> [Telefon, E-Mail]
            </p>
            <p>
              <strong className="font-semibold">Vertretungsberechtigt:</strong> [Name des Geschäftsführers / Verantwortlichen]
            </p>
            <p>
              <strong className="font-semibold">Umsatzsteuer-ID:</strong> [falls zutreffend, eintragen]
            </p>
          </div>
        </section>

        <section>
          <h2 className="ueberschrift text-[28px] md:text-[36px] text-schiefer-tief mb-3">Datenschutz</h2>
          <p className="text-[14px] text-leise mb-6">Dies ist ein Platzhalter. Vor dem Go-Live muss eine vollständige Datenschutzerklärung eingefügt werden.</p>
          <div className="karte p-5 md:p-7 space-y-4 text-[15px]">
            <p>
              <strong className="font-semibold">Verantwortliche Stelle:</strong> [Name und Anschrift]
            </p>
            <p>
              <strong className="font-semibold">Hosting:</strong> Supabase (Frankfurt) und Vercel
            </p>
            <p>
              <strong className="font-semibold">Transkription:</strong> Mistral (Datenverarbeitung außerhalb der EU möglich – DPA prüfen)
            </p>
            <p>
              <strong className="font-semibold">Gespeicherte Daten:</strong> Profile, Einträge, Tags, Dateien (Audio, PDF, Text), Protokollpunkte und Verknüpfungen.
            </p>
            <p>
              <strong className="font-semibold">Hinweis:</strong> Die Plattform ist für Wissen gedacht, nicht für Patientendaten. Anonymisierte Muster dürfen nur mit
              Einwilligung gespeichert werden.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
