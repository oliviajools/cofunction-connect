import Link from "next/link";
import { getRepo } from "@/lib/data";
import { ART_NAME, dauer, wann } from "@/lib/format";
import { ArtSymbol, Leer, Seitenkopf, StatusMarke, TagChip } from "@/components/bausteine";
import { ZuordnenForm } from "@/components/zuordnen-form";
import { AudioSpieler } from "@/components/audio-spieler";

export const metadata = { title: "Eingang" };

export default async function Eingang() {
  const repo = await getRepo();
  const [eintraege, bereiche] = await Promise.all([repo.eintraege({ bereichId: null, elternId: null }), repo.bereiche({ nurAktiv: true })]);
  const optionen = bereiche.map((b) => ({ id: b.id, name: b.name, art: b.art }));
  const urls = await Promise.all(eintraege.map((e) => (e.audioPfad ? repo.dateiUrl(e.audioPfad) : Promise.resolve(null))));

  return (
    <div>
      <Seitenkopf
        titel="Eingang"
        unter="Alles, was ohne Ziel hereinkam. Du ordnest von Hand zu – Tags kommen aus dem Regelwerk und sind nachvollziehbar. Jede Zuordnung wird gespeichert."
      />
      {eintraege.length === 0 ? (
        <div className="karte">
          <Leer titel="Eingang ist leer." text="Alles zugeordnet." />
        </div>
      ) : (
        <ul className="space-y-4">
          {eintraege.map((e, i) => (
            <li key={e.id} className="karte p-5 md:p-6 flex flex-col md:flex-row gap-5">
              <div className="flex gap-4 flex-1 min-w-0">
                <ArtSymbol art={e.art} gross />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <Link href={`/eintrag/${e.id}`} className="font-display text-[20px] leading-tight hover:underline underline-offset-2 decoration-nebel">
                      {e.titel || "Ohne Titel"}
                    </Link>
                    <StatusMarke status={e.status} fehler={e.fehler} />
                  </div>
                  <p className="text-[13px] text-leise">
                    {ART_NAME[e.art]}
                    {typeof e.meta.dauer === "number" ? ` · ${dauer(e.meta.dauer as number)}` : ""}
                    {e.ersteller ? ` · ${e.ersteller.name}` : ""} · {wann(e.erstelltAm)}
                    {e.quelle === "mail" && typeof e.meta.absender === "string" ? ` · von ${e.meta.absender}` : ""}
                  </p>
                  {e.inhalt && <p className="text-[14px] leading-relaxed text-tinte/85 line-clamp-4 whitespace-pre-line">{e.inhalt}</p>}
                  {urls[i] && <AudioSpieler src={urls[i]!} />}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] text-leise mr-1">{e.tags.length ? "Tags:" : "Keine Regel greift."}</span>
                    {e.tags.map((t) => (
                      <span key={t.name} className="inline-flex items-center gap-1">
                        <TagChip name={t.name} wort={t.regelWort} />
                        {t.regelWort && <span className="text-[11px] text-leise">← „{t.regelWort}“</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <ZuordnenForm eintragId={e.id} optionen={optionen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
