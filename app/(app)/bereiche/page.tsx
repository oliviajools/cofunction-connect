import Link from "next/link";
import { getRepo } from "@/lib/data";
import { mitUnterbereichen } from "@/lib/zaehler";
import type { BereichArt } from "@/lib/data/types";
import { BEREICH_MEHRZAHL, mehrzahl } from "@/lib/format";
import { Seitenkopf } from "@/components/bausteine";
import { IconPlus, IconSchloss } from "@/components/icons";

export const metadata = { title: "Bereiche" };

const ERKLAERUNG: Record<BereichArt, string> = {
  projekt: "Mit Ziel und Ende – woran gerade gearbeitet wird.",
  area: "Dauerhafte Verantwortungsbereiche – die Leistungsfelder.",
  ressource: "Nachschlagewissen für später.",
  archiv: "Abgeschlossenes und Ideen, die noch keinen Platz haben.",
};

export default async function Bereiche() {
  const repo = await getRepo();
  const [bereiche, direkt] = await Promise.all([repo.bereiche(), repo.bereichZaehler()]);
  const zaehler = mitUnterbereichen(bereiche, direkt);
  const arten: BereichArt[] = ["projekt", "area", "ressource", "archiv"];

  return (
    <div>
      <Seitenkopf
        titel="Bereiche"
        unter="Projekte, Areas, Ressourcen und Archiv – die Ordnung, in die Wissen händisch einsortiert wird."
        rechts={
          <Link href="/bereiche/neu" className="knopf knopf-voll">
            <IconPlus groesse={18} /> Neuer Bereich
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {arten.map((art) => {
          const liste = bereiche.filter((b) => b.art === art || (art === "archiv" && !b.aktiv && b.art !== "archiv"));
          const sichtbar = art === "archiv" ? liste : liste.filter((b) => b.aktiv);
          return (
            <section key={art} className="karte p-5 md:p-7">
              <h2 className="text-[24px] font-light">{BEREICH_MEHRZAHL[art]}</h2>
              <p className="text-[13px] text-leise mt-1 mb-3">{ERKLAERUNG[art]}</p>
              {sichtbar.length === 0 ? (
                <p className="text-sm text-leise py-2">Noch keine.</p>
              ) : (
                <ul>
                  {sichtbar.map((b) => (
                    <li key={b.id} className="border-t border-linie first:border-t-0">
                      <Link href={`/bereiche/${b.id}`} className="flex items-center gap-3 py-3 hover:text-schiefer-dunkel">
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2 text-[15px] font-medium">
                            {b.name}
                            {b.sichtbarkeit === "privat" && <IconSchloss groesse={14} className="text-leise" />}
                          </span>
                          {b.beschreibung && <span className="block text-[13px] text-leise truncate">{b.beschreibung}</span>}
                        </span>
                        <span className="text-[13px] text-leise shrink-0">{mehrzahl(zaehler[b.id]?.eintraege ?? 0, "Eintrag", "Einträge")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
