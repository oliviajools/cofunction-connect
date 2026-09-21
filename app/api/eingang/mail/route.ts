import { NextResponse, after } from "next/server";
import { istDemo, mailWebhookGeheimnis } from "@/lib/config";
import { systemRepo } from "@/lib/data";
import { ausPostmark, mailAnnehmen } from "@/lib/mail";
import { verarbeiteEintrag } from "@/lib/pipeline";
import { geheimnisAusAnfrage, gleich } from "@/lib/sicherheit";

export const maxDuration = 300;

/**
 * Eingang für weitergeleitete Mails (Postmark Inbound Webhook).
 * Webhook-URL: https://<app>/api/eingang/mail?token=<MAIL_WEBHOOK_SECRET>
 */
export async function POST(request: Request) {
  const geheimnis = mailWebhookGeheimnis();
  if (!istDemo && !geheimnis) return NextResponse.json({ fehler: "MAIL_WEBHOOK_SECRET fehlt" }, { status: 503 });
  if (geheimnis && !gleich(geheimnisAusAnfrage(request), geheimnis)) return NextResponse.json({ fehler: "Nicht erlaubt" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ fehler: "Kein gültiges JSON" }, { status: 400 });
  }

  const mail = ausPostmark(payload);
  const admin = await systemRepo();
  const ergebnis = await mailAnnehmen(mail, await admin.profile(), (id) => systemRepo(id));
  // Unbekannte Absender: 200 zurückgeben, damit der Dienst nicht endlos wiederholt – aber nichts speichern.
  if (!ergebnis.ok) return NextResponse.json({ angenommen: false, grund: ergebnis.grund });

  after(async () => {
    for (const id of ergebnis.eintragIds) {
      const e = await admin.eintrag(id);
      if (e) await verarbeiteEintrag(await systemRepo(e.erstelltVon), id);
    }
  });
  return NextResponse.json({ angenommen: true, eintraege: ergebnis.eintragIds.length, bereich: ergebnis.bereich ?? "Eingang" });
}
