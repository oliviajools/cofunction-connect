import type { Bereich, BereichZaehler } from "./data/types";

/** Areas zeigen ihre eigenen Einträge plus die ihrer Projekte. */
export function mitUnterbereichen(bereiche: Bereich[], zaehler: Record<string, BereichZaehler>): Record<string, BereichZaehler> {
  const summe: Record<string, BereichZaehler> = {};
  for (const b of bereiche) summe[b.id] = { eintraege: zaehler[b.id]?.eintraege ?? 0, meetings: zaehler[b.id]?.meetings ?? 0 };
  for (const b of bereiche) {
    if (!b.elternId || !summe[b.elternId]) continue;
    summe[b.elternId].eintraege += zaehler[b.id]?.eintraege ?? 0;
    summe[b.elternId].meetings += zaehler[b.id]?.meetings ?? 0;
  }
  return summe;
}
