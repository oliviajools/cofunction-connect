// Wiederverwendbare Darstellungsbausteine (Server-tauglich).

import Link from "next/link";
import type { EintragVoll } from "@/lib/data/types";
import { ART_NAME, dauer, STATUS_TEXT, wann } from "@/lib/format";
import { ART_ICON, IconSchloss } from "./icons";

/** Das Schalter-Motiv aus dem Logo. `rechts` = Knopf rechts. */
export function SchalterBild({ rechts, hell = false }: { rechts: boolean; hell?: boolean }) {
  return (
    <span aria-hidden="true" className="relative inline-block h-[22px] w-[46px] shrink-0">
      <span className={`absolute inset-y-[3px] inset-x-0 rounded-full border-[3px] ${hell ? "border-nebel/80" : "border-nebel"}`} />
      <span
        className={`absolute top-0 h-[22px] w-[22px] rounded-full border-[3px] transition-all duration-200 ${
          hell ? "border-white" : "border-schiefer"
        } ${rechts ? "left-[24px]" : "left-0"} ${hell ? "bg-schiefer" : "bg-grund"}`}
      />
    </span>
  );
}

export function TagChip({ name, wort, klein }: { name: string; wort?: string | null; klein?: boolean }) {
  return (
    <span className={`tag ${klein ? "!text-[11px] !px-2 !py-0.5" : ""}`} title={wort ? `Regel: „${wort}“ → #${name}` : undefined}>
      #{name}
    </span>
  );
}

export function StatusMarke({ status, fehler }: { status: EintragVoll["status"]; fehler?: string | null }) {
  if (status === "bereit") return null;
  const stil =
    status === "fehler"
      ? "bg-[#f6e3de] text-signal"
      : status === "verarbeitung"
        ? "bg-dunst text-schiefer-tief animate-pulse"
        : "bg-sand text-sand-tinte";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${stil}`} title={fehler ?? undefined}>
      {STATUS_TEXT[status]}
    </span>
  );
}

export function ArtSymbol({ art, gross }: { art: EintragVoll["art"]; gross?: boolean }) {
  const Icon = ART_ICON[art];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-dunst text-schiefer-dunkel ${gross ? "h-12 w-12" : "h-10 w-10"}`}
      title={ART_NAME[art]}
    >
      <Icon groesse={gross ? 22 : 19} />
    </span>
  );
}

export function EintragZeile({ e, zeigeBereich = true }: { e: EintragVoll; zeigeBereich?: boolean }) {
  const d = typeof e.meta.dauer === "number" ? dauer(e.meta.dauer as number) : "";
  return (
    <li className="group flex gap-3.5 py-3.5 border-t border-linie first:border-t-0">
      <ArtSymbol art={e.art} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Link href={`/eintrag/${e.id}`} className="font-medium text-[15px] leading-snug hover:underline underline-offset-2 decoration-nebel">
            {e.titel || "Ohne Titel"}
          </Link>
          {e.sichtbarkeit === "privat" && (
            <span className="text-leise" title="Nur für dich sichtbar">
              <IconSchloss groesse={14} />
            </span>
          )}
          <StatusMarke status={e.status} fehler={e.fehler} />
        </div>
        <div className="mt-0.5 text-[13px] text-leise flex flex-wrap gap-x-2">
          <span>{ART_NAME[e.art]}</span>
          {d && <span>· {d}</span>}
          {e.ersteller && <span>· {e.ersteller.name}</span>}
          <span>· {wann(e.erstelltAm)}</span>
        </div>
        {e.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {e.tags.map((t) => (
              <TagChip key={t.name} name={t.name} wort={t.regelWort} klein />
            ))}
          </div>
        )}
      </div>
      {zeigeBereich && (
        <span
          className={`hidden sm:inline-flex self-start mt-1 shrink-0 max-w-[200px] truncate rounded-full px-2.5 py-1 text-[12px] font-medium ${
            e.bereich ? "bg-dunst text-schiefer-tief" : "bg-sand text-sand-tinte"
          }`}
        >
          {e.bereich?.name ?? "Eingang"}
        </span>
      )}
    </li>
  );
}

export function Leer({ titel, text }: { titel: string; text?: string }) {
  return (
    <div className="py-12 text-center">
      <p className="ueberschrift text-2xl text-schiefer-tief">{titel}</p>
      {text && <p className="mt-2 text-sm text-leise">{text}</p>}
    </div>
  );
}

export function Seitenkopf({ titel, unter, rechts, etikett }: { titel: string; unter?: React.ReactNode; rechts?: React.ReactNode; etikett?: React.ReactNode }) {
  return (
    <div className="mb-7 md:mb-10 flex flex-col md:flex-row md:items-end gap-4">
      <div className="flex-1 min-w-0">
        {etikett && <div className="etikett mb-2">{etikett}</div>}
        <h1 className="ueberschrift text-[38px] md:text-[56px] text-schiefer-tief">{titel}</h1>
        {unter && <div className="mt-2 text-[15px] text-leise max-w-2xl">{unter}</div>}
      </div>
      {rechts && <div className="flex flex-wrap gap-2">{rechts}</div>}
    </div>
  );
}
