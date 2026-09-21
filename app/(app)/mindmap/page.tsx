import { getRepo } from "@/lib/data";
import { MindmapKanvas } from "@/components/mindmap-kanvas";
import { Seitenkopf } from "@/components/bausteine";

export const metadata = { title: "Mindmap" };

export default async function MindmapPage() {
  const repo = await getRepo();
  const { knoten, kanten } = await repo.mindmapDaten();
  const nutzer = await repo.nutzer();

  return (
    <div>
      <Seitenkopf
        titel="Mindmap"
        unter="Wie Bereiche und Projekte zusammenhängen – Eltern-Kind-Beziehungen und eigene Verknüpfungen."
      />
      <MindmapKanvas knoten={knoten} kanten={kanten} canEdit={nutzer.rolle === "admin" || nutzer.rolle === "mitglied"} />
    </div>
  );
}
