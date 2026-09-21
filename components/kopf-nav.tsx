"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PUNKTE = [
  { href: "/", text: "Übersicht" },
  { href: "/eingang", text: "Eingang" },
  { href: "/bereiche", text: "Bereiche" },
  { href: "/mindmap", text: "Mindmap" },
  { href: "/suche", text: "Suche" },
  { href: "/regelwerk", text: "Regelwerk" },
];

export function aktiv(pfad: string, href: string) {
  if (href === "/") return pfad === "/";
  return pfad === href || pfad.startsWith(`${href}/`) || (href === "/bereiche" && pfad.startsWith("/eintrag"));
}

export function KopfNav({ eingang }: { eingang: number }) {
  const pfad = usePathname();
  return (
    <nav aria-label="Hauptnavigation" className="hidden md:flex items-center gap-7">
      {PUNKTE.map((p) => {
        const an = aktiv(pfad, p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={an ? "page" : undefined}
            className={`relative py-1.5 font-display text-[15px] uppercase tracking-[0.06em] text-white/90 hover:text-white ${
              an ? "text-white after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-white" : ""
            }`}
          >
            {p.text}
            {p.href === "/eingang" && eingang > 0 && (
              <span className="ml-1.5 inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-white text-schiefer-tief text-[11px] font-sans font-semibold tracking-normal align-[2px]">
                {eingang}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
