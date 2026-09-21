import Link from "next/link";
import { getRepo } from "@/lib/data";
import { mitUnterbereichen } from "@/lib/zaehler";
import { mailAdresse } from "@/lib/config";
import { BEREICH_NAME, mehrzahl } from "@/lib/format";
import { EintragZeile, Leer, SchalterBild } from "@/components/bausteine";
import { IconDatei, IconEingang, IconMail, IconMeeting, IconMikro, IconPfeil, IconText } from "@/components/icons";

export const metadata = { title: "Übersicht" };

export default async function Uebersicht(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const persoenlich = sp.ansicht === "persoenlich";
  const repo = await getRepo();
  const nutzer = await repo.nutzer();

  const [bereiche, direkt, eingang, zuletzt] = await Promise.all([
    repo.bereiche({ nurAktiv: true }),
    repo.bereichZaehler(),
    repo.eingangAnzahl(),
    repo.eintraege({ limit: 8, elternId: null, erstelltVon: persoenlich ? nutzer.id : undefined }),
  ]);

  const zaehler = mitUnterbereichen(bereiche, direkt);
  const projekte = bereiche
    .filter((b) => b.art === "projekt")
    .filter((b) => (persoenlich ? b.besitzerId === nutzer.id || b.sichtbarkeit === "privat" : b.sichtbarkeit === "team"))
    .sort((a, b) => (zaehler[b.id]?.eintraege ?? 0) - (zaehler[a.id]?.eintraege ?? 0))
    .slice(0, 6);
  const areas = bereiche.filter((b) => b.art === "area" && (persoenlich ? b.sichtbarkeit === "privat" : b.sichtbarkeit === "team"));
  const privat = bereiche.filter((b) => b.sichtbarkeit === "privat");
  const vorname = nutzer.name.split(" ")[0];

  return (
    <div className="space-y-8 md:space-y-10">
      <section className="flex flex-col md:flex-row md:items-end gap-5">
        <div className="flex-1">
          <p className="etikett mb-2">{persoenlich ? "Persönlich · nur für dich" : "Team · Ralph und Kernteam"}</p>
          <h1 className="ueberschrift text-[40px] md:text-[64px] text-schiefer-tief">Hallo {vorname}.</h1>
          <p className="mt-2 text-[15px] text-leise">
            {persoenlich ? "Deine Projekte, Notizen und Ideen – niemand sonst sieht sie." : "Was im Team zuletzt eingebracht wurde."}
          </p>
        </div>
        <Link
          href={persoenlich ? "/" : "/?ansicht=persoenlich"}
          className="self-start md:self-auto inline-flex items-center gap-3 rounded-full bg-white border border-linie px-4 py-2.5 text-[14px] font-medium hover:border-nebel"
          aria-label={persoenlich ? "Zur Team-Ansicht wechseln" : "Zur persönlichen Ansicht wechseln"}
        >
          <span className={persoenlich ? "text-leise" : "text-schiefer-tief"}>Team</span>
          <SchalterBild rechts={persoenlich} />
          <span className={persoenlich ? "text-schiefer-tief" : "text-leise"}>Persönlich</span>
        </Link>
      </section>

      {!persoenlich && eingang > 0 && (
        <Link
          href="/eingang"
          className="flex items-center gap-4 md:gap-6 rounded-[28px] bg-schiefer text-white px-5 md:px-8 py-5 md:py-6 hover:bg-schiefer-dunkel transition-colors"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-white">
            <IconEingang groesse={22} />
          </span>
          <span className="flex-1">
            <span className="block ueberschrift text-2xl md:text-3xl">{mehrzahl(eingang, "Eintrag wartet", "Einträge warten")} auf Zuordnung</span>
            <span className="block mt-1 text-[14px] text-white/80">Im Eingang ordnest du von Hand zu – Tags setzt das Regelwerk.</span>
          </span>
          <IconPfeil groesse={24} className="hidden sm:block" />
        </Link>
      )}

      <section aria-label="Schnell erfassen" className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link href="/erfassen" className="knopf knopf-voll !rounded-2xl !min-h-14 col-span-2 md:col-span-1">
          <IconMikro /> Sprachnotiz
        </Link>
        <Link href="/erfassen?modus=meeting" className="knopf knopf-rand !rounded-2xl !min-h-14">
          <IconMeeting /> Meeting
        </Link>
        <Link href="/erfassen?modus=datei" className="knopf knopf-rand !rounded-2xl !min-h-14">
          <IconDatei /> Datei
        </Link>
        <Link href="/erfassen?modus=text" className="knopf knopf-rand !rounded-2xl !min-h-14">
          <IconText /> Text
        </Link>
        <div className="col-span-2 md:col-span-1 flex items-center gap-2 rounded-2xl border border-linie bg-white px-4 min-h-14 text-[13px] text-leise">
          <IconMail groesse={18} className="shrink-0" />
          <span className="truncate">
            Weiterleiten an <span className="font-medium text-tinte">{mailAdresse()}</span>
          </span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="karte p-5 md:p-7">
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-[20px] font-normal flex-1">{persoenlich ? "Meine Projekte" : "Aktive Projekte"}</h2>
              <Link href="/bereiche" className="text-[13px] text-schiefer-dunkel hover:underline">
                Alle Bereiche
              </Link>
            </div>
            {projekte.length ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {projekte.map((p) => (
                  <Link
                    key={p.id}
                    href={`/bereiche/${p.id}`}
                    className="rounded-2xl bg-grund border border-linie p-4 hover:border-schiefer-hell transition-colors flex flex-col gap-2"
                  >
                    <span className="etikett">{p.sichtbarkeit === "privat" ? "Privat" : BEREICH_NAME[p.art]}</span>
                    <span className="font-display text-[19px] leading-tight">{p.name}</span>
                    <span className="text-[13px] text-leise">
                      {mehrzahl(zaehler[p.id]?.eintraege ?? 0, "Eintrag", "Einträge")} · {mehrzahl(zaehler[p.id]?.meetings ?? 0, "Meeting", "Meetings")}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-leise">
                Noch keine Projekte.{" "}
                <Link href="/bereiche/neu" className="underline">
                  Projekt anlegen
                </Link>
              </p>
            )}
          </section>

          <section className="karte p-5 md:p-7">
            <h2 className="text-[20px] font-normal mb-2">{persoenlich ? "Zuletzt von dir" : "Zuletzt erfasst"}</h2>
            {zuletzt.length ? (
              <ul>
                {zuletzt.map((e) => (
                  <EintragZeile key={e.id} e={e} />
                ))}
              </ul>
            ) : (
              <Leer titel="Noch nichts erfasst." text="Tippe auf „Sprachnotiz“ und sprich einfach los." />
            )}
          </section>
        </div>

        <aside className="karte p-5 md:p-7 self-start">
          <h2 className="text-[20px] font-normal">{persoenlich ? "Privat" : "Areas"}</h2>
          <p className="text-[13px] text-leise mt-1 mb-3">
            {persoenlich ? "Bereiche, die nur du siehst." : "Die fünf Leistungsfelder als dauerhafte Bereiche."}
          </p>
          <ul>
            {(persoenlich ? privat : areas).map((a) => (
              <li key={a.id} className="border-t border-linie first:border-t-0">
                <Link href={`/bereiche/${a.id}`} className="flex items-center gap-3 py-3 hover:text-schiefer-dunkel">
                  <span className="h-2 w-2 rounded-full bg-schiefer shrink-0" />
                  <span className="flex-1 text-[15px]">{a.name}</span>
                  <span className="text-[13px] text-leise">{zaehler[a.id]?.eintraege ?? 0}</span>
                </Link>
              </li>
            ))}
            {(persoenlich ? privat : areas).length === 0 && <li className="text-sm text-leise py-2">Noch keine.</li>}
          </ul>
        </aside>
      </div>
    </div>
  );
}
