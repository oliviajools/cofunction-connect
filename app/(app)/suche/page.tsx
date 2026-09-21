import Link from "next/link";
import { getRepo } from "@/lib/data";
import type { EintragArt } from "@/lib/data/types";
import { ART_NAME } from "@/lib/format";
import { EintragZeile, Leer, Seitenkopf } from "@/components/bausteine";
import { IconSuche } from "@/components/icons";

export const metadata = { title: "Suche" };

const ARTEN = Object.keys(ART_NAME) as EintragArt[];

export default async function Suche(props: PageProps<"/suche">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 200) : "";
  const tag = typeof sp.tag === "string" ? sp.tag : "";
  const art = ARTEN.find((a) => a === sp.art);
  const repo = await getRepo();
  const aktiv = !!(q || tag || art);
  const roh = aktiv ? await repo.eintraege({ suche: q || undefined, arten: art ? [art] : undefined, limit: tag ? 1000 : 100 }) : [];
  const treffer = tag ? roh.filter((e) => e.tags.some((t) => t.name === tag)).slice(0, 100) : roh;

  const link = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, tag, art, ...p })) if (v) u.set(k, v);
    return `/suche?${u.toString()}`;
  };

  return (
    <div>
      <Seitenkopf titel="Suche" unter="Volltextsuche über Titel, Transkripte und Dokumenttexte." />
      <form action="/suche" className="relative max-w-2xl">
        <IconSuche className="absolute left-4 top-1/2 -translate-y-1/2 text-leise" />
        <label htmlFor="q" className="sr-only">
          Suchbegriff
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="z. B. Eingangsdiagnostik Hockey" className="feld !rounded-full !min-h-14 !pl-12 !text-[16px]" autoFocus={!aktiv} />
        {tag && <input type="hidden" name="tag" value={tag} />}
        {art && <input type="hidden" name="art" value={art} />}
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {ARTEN.map((a) => (
          <Link
            key={a}
            href={link({ art: art === a ? undefined : a })}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${art === a ? "bg-schiefer border-schiefer text-white" : "bg-white border-nebel"}`}
          >
            {ART_NAME[a]}
          </Link>
        ))}
        {tag && (
          <Link href={link({ tag: undefined })} className="rounded-full bg-schiefer text-white px-3.5 py-1.5 text-[13px] font-medium">
            #{tag} ✕
          </Link>
        )}
      </div>
      <section className="karte mt-6 px-5 md:px-7 py-2">
        {!aktiv ? (
          <Leer titel="Wonach suchst du?" text="Suchbegriff eingeben oder nach Art filtern." />
        ) : treffer.length ? (
          <ul>
            {treffer.map((e) => (
              <EintragZeile key={e.id} e={e} />
            ))}
          </ul>
        ) : (
          <Leer titel="Nichts gefunden." text="Anderer Begriff? Die Suche findet auch gebeugte Formen (Test → Tests)." />
        )}
      </section>
    </div>
  );
}
