import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { mailAdresseFuer } from "@/lib/config";
import { BEREICH_NAME, mehrzahl, wann } from "@/lib/format";
import { EintragZeile, Leer, TagChip } from "@/components/bausteine";
import { IconMeeting, IconMikro, IconSchloss } from "@/components/icons";
import { BereichBearbeiten } from "@/components/bereich-bearbeiten";
import { IdeeForm } from "@/components/idee-form";

export default async function BereichSeite(props: PageProps<"/bereiche/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const tab = sp.tab === "meetings" || sp.tab === "brainstorm" ? sp.tab : "wissen";
  const repo = await getRepo();
  const bereich = await repo.bereich(id);
  if (!bereich) notFound();

  const [alle, alleBereiche] = await Promise.all([repo.eintraege({ bereichId: id, limit: 1000 }), repo.bereiche()]);
  const hauptebene = alle.filter((e) => !e.elternId || e.art === "baustein");
  const wissen = hauptebene.filter((e) => e.art !== "idee" && e.art !== "meeting");
  const meetings = hauptebene.filter((e) => e.art === "meeting");
  const ideen = hauptebene.filter((e) => e.art === "idee");
  const eltern = bereich.elternId ? alleBereiche.find((b) => b.id === bereich.elternId) : null;
  const kinder = alleBereiche.filter((b) => b.elternId === bereich.id);

  const tagZahl = new Map<string, number>();
  for (const e of alle) for (const t of e.tags) tagZahl.set(t.name, (tagZahl.get(t.name) ?? 0) + 1);
  const topTags = [...tagZahl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const tabs = [
    { id: "wissen", text: `Wissen · ${wissen.length}` },
    { id: "meetings", text: `Meetings · ${meetings.length}` },
    { id: "brainstorm", text: `Brainstorm · ${ideen.length}` },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end gap-5">
        <div className="flex-1 min-w-0">
          <p className="etikett mb-2 flex items-center gap-2">
            {BEREICH_NAME[bereich.art]}
            {eltern && (
              <>
                {" · "}
                <Link href={`/bereiche/${eltern.id}`} className="hover:underline">
                  {eltern.name}
                </Link>
              </>
            )}
            {bereich.sichtbarkeit === "privat" && (
              <span className="inline-flex items-center gap-1">
                · <IconSchloss groesse={13} /> Privat
              </span>
            )}
            {!bereich.aktiv && <span>· abgeschlossen</span>}
          </p>
          <h1 className="ueberschrift text-[38px] md:text-[56px] text-schiefer-tief">{bereich.name}</h1>
          {bereich.beschreibung && <p className="mt-2 text-[15px] text-leise max-w-2xl">{bereich.beschreibung}</p>}
          <p className="mt-3 text-[13px] text-leise flex flex-wrap gap-x-4 gap-y-1">
            <span>{mehrzahl(wissen.length + meetings.length, "Eintrag", "Einträge")}</span>
            <span>
              Direkt hierher weiterleiten: <span className="font-medium text-tinte select-all">{mailAdresseFuer(bereich.slug)}</span>
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/erfassen?bereich=${bereich.id}`} className="knopf knopf-voll">
            <IconMikro groesse={18} /> Hierher erfassen
          </Link>
          <Link href={`/erfassen?bereich=${bereich.id}&modus=meeting`} className="knopf knopf-rand">
            <IconMeeting groesse={18} /> Meeting
          </Link>
          <BereichBearbeiten bereich={{ id: bereich.id, name: bereich.name, beschreibung: bereich.beschreibung, art: bereich.art, aktiv: bereich.aktiv }} />
        </div>
      </div>

      <div role="tablist" aria-label="Inhalte des Bereichs" className="flex gap-1 border-b border-linie mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            href={t.id === "wissen" ? `/bereiche/${id}` : `/bereiche/${id}?tab=${t.id}`}
            className={`px-4 py-3 text-[14px] font-medium -mb-px border-b-2 whitespace-nowrap ${
              tab === t.id ? "border-schiefer text-schiefer-tief" : "border-transparent text-leise hover:text-tinte"
            }`}
          >
            {t.text}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {tab === "wissen" && (
            <section className="karte px-5 md:px-7 py-2">
              {wissen.length ? (
                <ul>
                  {wissen.map((e) => (
                    <EintragZeile key={e.id} e={e} zeigeBereich={false} />
                  ))}
                </ul>
              ) : (
                <Leer titel="Noch kein Wissen hier." text="Über „Hierher erfassen“ oder die Mail-Adresse landet es direkt in diesem Bereich." />
              )}
            </section>
          )}
          {tab === "meetings" && (
            <section className="karte px-5 md:px-7 py-2">
              {meetings.length ? (
                <ul>
                  {meetings.map((e) => (
                    <EintragZeile key={e.id} e={e} zeigeBereich={false} />
                  ))}
                </ul>
              ) : (
                <Leer titel="Noch keine Meetings." text="Nimm das nächste Meeting direkt am Handy auf." />
              )}
            </section>
          )}
          {tab === "brainstorm" && (
            <section className="space-y-4">
              <IdeeForm bereichId={bereich.id} privat={bereich.sichtbarkeit === "privat"} />
              {ideen.length ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {ideen.map((i) => (
                    <Link
                      key={i.id}
                      href={`/eintrag/${i.id}`}
                      className="rounded-[20px] bg-white border border-linie p-4 min-h-32 flex flex-col gap-3 hover:border-schiefer-hell"
                    >
                      <span className="text-[15px] leading-snug flex-1">{i.titel}</span>
                      <span className="text-[12px] text-leise">
                        {i.ersteller?.name} · {wann(i.erstelltAm)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Leer titel="Noch keine Ideen." />
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="karte p-5">
            <h2 className="text-[18px] font-normal mb-3">Häufige Tags</h2>
            {topTags.length ? (
              <div className="flex flex-wrap gap-1.5">
                {topTags.map(([name, n]) => (
                  <Link key={name} href={`/suche?tag=${encodeURIComponent(name)}`}>
                    <TagChip name={`${name} ${n}`} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-leise">Noch keine.</p>
            )}
          </section>
          {(eltern || kinder.length > 0) && (
            <section className="karte p-5">
              <h2 className="text-[18px] font-normal mb-2">Zusammenhang</h2>
              <ul className="text-[14px]">
                {eltern && (
                  <li className="py-1.5">
                    <Link href={`/bereiche/${eltern.id}`} className="hover:underline">
                      {BEREICH_NAME[eltern.art]} · {eltern.name}
                    </Link>
                  </li>
                )}
                {kinder.map((k) => (
                  <li key={k.id} className="py-1.5">
                    <Link href={`/bereiche/${k.id}`} className="hover:underline">
                      {BEREICH_NAME[k.art]} · {k.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
