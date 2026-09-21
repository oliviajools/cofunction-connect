import { getRepo } from "@/lib/data";
import { exportZip } from "@/lib/export";

export const maxDuration = 120;

export async function GET() {
  const repo = await getRepo();
  const [bereiche, eintraege] = await Promise.all([repo.bereiche(), repo.eintraege({ limit: 10000 })]);
  const protokolle: Record<string, Awaited<ReturnType<typeof repo.protokoll>>> = {};
  for (const e of eintraege.filter((x) => x.art === "meeting")) protokolle[e.id] = await repo.protokoll(e.id);
  const zip = await exportZip(bereiche, eintraege, protokolle);
  const datum = new Date().toISOString().slice(0, 10);
  return new Response(zip as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="cofunction-wissen-${datum}.zip"`,
    },
  });
}
