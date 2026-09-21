import { NextResponse } from "next/server";
import { istDemo } from "@/lib/config";
import { demoStore } from "@/lib/data/demo-repo";

/** Nur im Demo-Modus: nimmt Uploads entgegen und hält sie im Speicher. */
export async function PUT(request: Request) {
  if (!istDemo) return NextResponse.json({ fehler: "Nur im Demo-Modus" }, { status: 404 });
  const pfad = new URL(request.url).searchParams.get("pfad") ?? "";
  if (!/^[a-zA-Z0-9-]+\/\d{4}\/[a-zA-Z0-9._-]+$/.test(pfad)) return NextResponse.json({ fehler: "Ungültiger Pfad" }, { status: 400 });
  const daten = new Uint8Array(await request.arrayBuffer());
  if (daten.byteLength > 100 * 1024 * 1024) return NextResponse.json({ fehler: "Zu groß für den Demo-Modus" }, { status: 413 });
  demoStore().dateien.set(pfad, { daten, typ: request.headers.get("content-type") ?? "application/octet-stream" });
  return NextResponse.json({ ok: true });
}
