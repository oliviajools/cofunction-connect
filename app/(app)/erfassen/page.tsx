import { getRepo } from "@/lib/data";
import { Erfasser, type Ziel } from "@/components/erfasser";

export const metadata = { title: "Erfassen" };
export const maxDuration = 300;

const MODI = ["notiz", "meeting", "datei", "text"] as const;

export default async function ErfassenSeite(props: PageProps<"/erfassen">) {
  const sp = await props.searchParams;
  const repo = await getRepo();
  const [bereiche, zaehler] = await Promise.all([repo.bereiche({ nurAktiv: true }), repo.bereichZaehler()]);
  const rang = { projekt: 0, area: 1, ressource: 2, archiv: 3 } as const;
  const ziele: Ziel[] = bereiche
    .filter((b) => b.art !== "archiv")
    .sort((a, b) => rang[a.art] - rang[b.art] || (zaehler[b.id]?.eintraege ?? 0) - (zaehler[a.id]?.eintraege ?? 0))
    .map((b) => ({ id: b.id, name: b.name, art: b.art, privat: b.sichtbarkeit === "privat" }));
  const modus = MODI.find((m) => m === sp.modus) ?? "notiz";
  const vorauswahl = typeof sp.bereich === "string" && bereiche.some((b) => b.id === sp.bereich) ? sp.bereich : null;

  return (
    <div>
      <div className="mb-5 sm:mb-8 text-center">
        <h1 className="ueberschrift text-[34px] md:text-[52px] text-schiefer-tief">Erfassen</h1>
        <p className="mt-1 text-[15px] text-leise max-sm:hidden">Sprechen, hochladen oder aufschreiben – einsortiert wird von Hand.</p>
      </div>
      <Erfasser ziele={ziele} startModus={modus} vorauswahl={vorauswahl} />
    </div>
  );
}
