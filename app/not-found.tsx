import Link from "next/link";

export default function NichtGefunden() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <p className="ueberschrift text-[44px] text-schiefer-tief">Nicht gefunden.</p>
      <p className="mt-2 text-leise">Diesen Eintrag gibt es nicht – oder er ist nur für jemand anderen sichtbar.</p>
      <Link href="/" className="knopf knopf-voll mt-6">
        Zur Übersicht
      </Link>
    </div>
  );
}
