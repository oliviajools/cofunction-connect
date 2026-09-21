import { istDemo } from "@/lib/config";
import { demoStore } from "@/lib/data/demo-repo";

export async function GET(request: Request) {
  if (!istDemo) return new Response("Nicht gefunden", { status: 404 });
  const datei = demoStore().dateien.get(new URL(request.url).searchParams.get("pfad") ?? "");
  if (!datei) return new Response("Nicht gefunden", { status: 404 });
  return new Response(datei.daten as BodyInit, { headers: { "content-type": datei.typ, "cache-control": "private, max-age=3600" } });
}
