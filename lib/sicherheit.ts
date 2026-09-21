import { timingSafeEqual } from "node:crypto";

/** Vergleich in konstanter Zeit – verhindert, dass Geheimnisse über Antwortzeiten erraten werden. */
export function gleich(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/** Geheimnis aus ?token=…, „Authorization: Bearer …“ oder Basic-Auth (Passwort) lesen. */
export function geheimnisAusAnfrage(request: Request): string {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (token) return token;
  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  if (auth.startsWith("Basic ")) {
    const roh = Buffer.from(auth.slice(6), "base64").toString("utf8");
    return roh.slice(roh.indexOf(":") + 1);
  }
  return "";
}
