import { NextResponse } from "next/server";
import { cronGeheimnis } from "@/lib/config";
import { systemRepo } from "@/lib/data";
import { verarbeiteEintrag } from "@/lib/pipeline";
import { geheimnisAusAnfrage, gleich } from "@/lib/sicherheit";

export const maxDuration = 300;

/**
 * Sicherheitsnetz (Vercel Cron): verarbeitet Einträge, die hängen geblieben sind –
 * z. B. wenn eine Transkription durch einen Neustart unterbrochen wurde.
 */
export async function GET(request: Request) {
  const geheimnis = cronGeheimnis();
  if (!geheimnis || !gleich(geheimnisAusAnfrage(request), geheimnis)) return NextResponse.json({ fehler: "Nicht erlaubt" }, { status: 401 });

  const admin = await systemRepo();
  const grenze = Date.now() - 10 * 60_000;
  const offen = (await admin.eintraege({ status: ["verarbeitung", "fehler"], limit: 50 })).filter(
    (e) => new Date(e.aktualisiertAm).getTime() < grenze && Number(e.meta.versuche ?? 0) < 3,
  );
  for (const e of offen) await verarbeiteEintrag(await systemRepo(e.erstelltVon), e.id);
  return NextResponse.json({ verarbeitet: offen.length });
}
