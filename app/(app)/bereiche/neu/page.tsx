import { getRepo } from "@/lib/data";
import { bereichAnlegen } from "@/app/aktionen";
import { Seitenkopf } from "@/components/bausteine";

export const metadata = { title: "Neuer Bereich" };

export default async function NeuerBereich(props: PageProps<"/bereiche/neu">) {
  const sp = await props.searchParams;
  const areas = (await (await getRepo()).bereiche({ art: "area", nurAktiv: true })).filter((a) => a.sichtbarkeit === "team");
  const art = ["projekt", "area", "ressource", "archiv"].includes(String(sp.art)) ? String(sp.art) : "projekt";

  return (
    <div className="max-w-xl">
      <Seitenkopf titel="Neuer Bereich" unter="Der Kurzname für Mail-Weiterleitungen wird automatisch aus dem Namen gebildet." />
      <form action={bereichAnlegen} className="karte p-6 space-y-5">
        <label className="block">
          <span className="text-[13px] font-semibold">Name</span>
          <input name="name" required maxLength={120} className="feld mt-1" placeholder="z. B. Leistungsstützpunkt Hockey" autoFocus />
        </label>
        <fieldset>
          <legend className="text-[13px] font-semibold">Art</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["projekt", "Projekt", "hat ein Ziel und ein Ende"],
              ["area", "Area", "dauerhafter Bereich"],
              ["ressource", "Ressource", "Nachschlagewissen"],
              ["archiv", "Archiv", "abgelegt"],
            ].map(([wert, name, text]) => (
              <label key={wert} className="flex items-start gap-2.5 rounded-2xl border border-linie p-3 cursor-pointer has-[:checked]:border-schiefer has-[:checked]:bg-grund">
                <input type="radio" name="art" value={wert} defaultChecked={wert === art} className="mt-1 accent-[var(--color-schiefer)]" />
                <span>
                  <span className="block text-[14px] font-medium">{name}</span>
                  <span className="block text-[12px] text-leise">{text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="text-[13px] font-semibold">Gehört zu Area (optional)</span>
          <select name="elternId" className="feld mt-1" defaultValue="">
            <option value="">–</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold">Beschreibung (optional)</span>
          <textarea name="beschreibung" rows={3} maxLength={2000} className="feld mt-1" />
        </label>
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="sichtbarkeit" value="privat" className="h-4 w-4 accent-[var(--color-schiefer)]" />
          Privat – nur für mich sichtbar
        </label>
        <button type="submit" className="knopf knopf-voll w-full">
          Anlegen
        </button>
      </form>
    </div>
  );
}
