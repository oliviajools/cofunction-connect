"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { aktiv } from "./kopf-nav";
import { IconEingang, IconMikro, IconMindmap, IconOrdner, IconSuche, IconUebersicht } from "./icons";

export function MobilLeiste({ eingang }: { eingang: number }) {
  const pfad = usePathname();
  const punkt = (href: string, text: string, Icon: typeof IconEingang, zahl?: number) => {
    const an = aktiv(pfad, href);
    return (
      <Link
        href={href}
        aria-current={an ? "page" : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${an ? "text-schiefer-tief font-semibold" : "text-leise"}`}
      >
        <span className="relative">
          <Icon groesse={22} />
          {!!zahl && (
            <span className="absolute -right-2.5 -top-1.5 min-w-4 h-4 px-1 rounded-full bg-schiefer text-white text-[10px] leading-4 text-center font-semibold">
              {zahl}
            </span>
          )}
        </span>
        {text}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Navigation"
      className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-linie bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-end">
        {punkt("/", "Übersicht", IconUebersicht)}
        {punkt("/eingang", "Eingang", IconEingang, eingang)}
        <Link href="/erfassen" className="flex flex-1 flex-col items-center -mt-5 pb-2 text-[11px] text-schiefer-tief font-semibold">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-schiefer text-white shadow-lg ring-4 ring-white">
            <IconMikro groesse={26} />
          </span>
          Erfassen
        </Link>
        {punkt("/bereiche", "Bereiche", IconOrdner)}
        {punkt("/mindmap", "Mindmap", IconMindmap)}
        {punkt("/suche", "Suche", IconSuche)}
      </div>
    </nav>
  );
}
