import Link from "next/link";
import { getRepo } from "@/lib/data";
import { mailAdresse, mailAdresseFuer } from "@/lib/config";
import { BEREICH_NAME } from "@/lib/format";
import { Seitenkopf } from "@/components/bausteine";
import { NeuAnwenden, NeueRegel, RegelListe, RegelTester } from "@/components/regelwerk-werkzeuge";

export const metadata = { title: "Regelwerk" };

export default async function Regelwerk() {
  const repo = await getRepo();
  const [regeln, bereiche] = await Promise.all([repo.regeln(), repo.bereiche({ nurAktiv: true })]);
  const ziele = bereiche.filter((b) => b.art !== "archiv" && b.sichtbarkeit === "team");

  return (
    <div>
      <Seitenkopf
        titel="Regelwerk"
        unter="Feste Regeln statt KI: Gleicher Text ergibt immer dieselben Tags, dieselbe Adresse immer dasselbe Ziel. Jede Regel ist sichtbar und von Hand änderbar."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="karte p-5 md:p-7 space-y-4">
          <div>
            <h2 className="text-[22px] font-light">Begriffe → Tags</h2>
            <p className="text-[13px] text-leise mt-1">
              Ein Begriff greift, wenn er im Text vorkommt – auch in zusammengesetzten Wörtern („Knie“ trifft „Kniebeuge“). Groß-/Kleinschreibung egal.
            </p>
          </div>
          <NeueRegel />
          <RegelListe regeln={regeln} />
          <div className="pt-2 border-t border-linie">
            <NeuAnwenden />
            <p className="mt-2 text-[12px] text-leise">Ersetzt nur Regel-Tags. Von Hand gesetzte Tags und Tags aus Mail-Betreffs bleiben.</p>
          </div>
        </section>

        <div className="space-y-6">
          <section className="karte p-5 md:p-7">
            <h2 className="text-[22px] font-light mb-3">Regel testen</h2>
            <RegelTester regeln={regeln} />
          </section>

          <section className="karte p-5 md:p-7">
            <h2 className="text-[22px] font-light">Mail-Routing</h2>
            <p className="text-[13px] text-leise mt-1 mb-3">
              Mails an diese Adressen landen direkt im jeweiligen Bereich. <span className="font-medium text-tinte">#tag</span> im Betreff setzt zusätzlich einen Tag.
              Nur Mails von Teammitgliedern werden angenommen.
            </p>
            <ul className="text-[14px]">
              <li className="flex flex-wrap gap-x-3 py-2 border-t border-linie first:border-t-0">
                <span className="font-mono text-[13px] select-all">{mailAdresse()}</span>
                <span className="text-leise">→ Eingang</span>
              </li>
              {ziele.map((b) => (
                <li key={b.id} className="flex flex-wrap gap-x-3 py-2 border-t border-linie">
                  <span className="font-mono text-[13px] select-all">{mailAdresseFuer(b.slug)}</span>
                  <Link href={`/bereiche/${b.id}`} className="text-leise hover:underline">
                    → {BEREICH_NAME[b.art]} · {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
