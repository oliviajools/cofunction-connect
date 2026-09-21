"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MindmapDaten, MindmapKante, MindmapKnoten } from "@/lib/data/types";
import { bereichEntknuepfen, bereichVerknuepfen } from "@/app/aktionen";
import { BEREICH_NAME } from "@/lib/format";
import { IconMuell, IconPlus, IconX } from "./icons";

type Punkt = { x: number; y: number };

interface KanvasProps extends MindmapDaten {
  canEdit?: boolean;
}

const ART_FARBE: Record<MindmapKnoten["art"], string> = {
  area: "#7d8d9b",
  projekt: "#586a7a",
  ressource: "#9b3b2a",
  archiv: "#56636f",
};

const ART_RAND: Record<MindmapKnoten["art"], string> = {
  area: "#586a7a",
  projekt: "#445566",
  ressource: "#7a2a1d",
  archiv: "#445566",
};

function anfangspositionen(knoten: MindmapKnoten[]): Record<string, Punkt> {
  const reihenfolge: MindmapKnoten["art"][] = ["area", "projekt", "ressource", "archiv"];
  const gruppiert = Object.groupBy(knoten, (k) => k.art);
  const positionen: Record<string, Punkt> = {};
  let idx = 0;
  for (const art of reihenfolge) {
    const gruppe = (gruppiert[art] ?? []).sort((a, b) => a.name.localeCompare(b.name, "de"));
    const radius = 180 + reihenfolge.indexOf(art) * 120;
    for (let i = 0; i < gruppe.length; i++) {
      const winkel = ((idx + i) / Math.max(knoten.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positionen[gruppe[i].id] = {
        x: Math.cos(winkel) * radius,
        y: Math.sin(winkel) * radius,
      };
    }
    idx += gruppe.length;
  }
  return positionen;
}

function kraftLayout(knoten: MindmapKnoten[], kanten: MindmapKante[]): Record<string, Punkt> {
  const pos = anfangspositionen(knoten);
  const kraft = 300;
  const idealeLaenge = 160;
  const bremsfaktor = 0.95;
  let temperatur = 1;

  for (let i = 0; i < 80; i++) {
    const kraefte: Record<string, Punkt> = {};
    for (const k of knoten) kraefte[k.id] = { x: 0, y: 0 };

    for (let a = 0; a < knoten.length; a++) {
      for (let b = a + 1; b < knoten.length; b++) {
        const ka = knoten[a];
        const kb = knoten[b];
        const dx = pos[ka.id].x - pos[kb.id].x;
        const dy = pos[ka.id].y - pos[kb.id].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = kraft / dist;
        const fx = (dx / dist) * f;
        const fy = (dy / dist) * f;
        kraefte[ka.id].x += fx;
        kraefte[ka.id].y += fy;
        kraefte[kb.id].x -= fx;
        kraefte[kb.id].y -= fy;
      }
    }

    for (const k of kanten) {
      const dx = pos[k.nach].x - pos[k.von].x;
      const dy = pos[k.nach].y - pos[k.von].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = ((dist - idealeLaenge) / dist) * 0.05;
      const fx = dx * f;
      const fy = dy * f;
      kraefte[k.von].x += fx;
      kraefte[k.von].y += fy;
      kraefte[k.nach].x -= fx;
      kraefte[k.nach].y -= fy;
    }

    for (const k of knoten) {
      kraefte[k.id].x -= pos[k.id].x * 0.01;
      kraefte[k.id].y -= pos[k.id].y * 0.01;
      pos[k.id].x += kraefte[k.id].x * temperatur;
      pos[k.id].y += kraefte[k.id].y * temperatur;
    }

    temperatur *= bremsfaktor;
  }
  return pos;
}

export function MindmapKanvas({ knoten, kanten, canEdit = true }: KanvasProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [skalierung, setSkalierung] = useState(1);
  const [verschiebung, setVerschiebung] = useState<Punkt>({ x: 0, y: 0 });
  const [offset, setOffset] = useState<Record<string, Punkt>>({});
  const [aktion, setAktion] = useState<{ typ: "ziehen"; id: string } | { typ: "verschieben"; start: Punkt; panStart: Punkt } | null>(null);
  const [ausgewaehlt, setAusgewaehlt] = useState<string | null>(null);
  const [fokusKante, setFokusKante] = useState<MindmapKante | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [groesse, setGroesse] = useState({ breite: 800, hoehe: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setGroesse({ breite: el.clientWidth, hoehe: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const basisPositionen = useMemo(() => kraftLayout(knoten, kanten), [knoten, kanten]);
  const positionen = useMemo(() => {
    const result: Record<string, Punkt> = {};
    for (const id in basisPositionen) {
      const o = offset[id] ?? { x: 0, y: 0 };
      result[id] = { x: basisPositionen[id].x + o.x, y: basisPositionen[id].y + o.y };
    }
    return result;
  }, [basisPositionen, offset]);

  const startZiehen = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setAktion({ typ: "ziehen", id });
  };

  const mausKoordinaten = (clientX: number, clientY: number): Punkt => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  };

  const bewegen = (clientX: number, clientY: number) => {
    if (!aktion) return;
    const m = mausKoordinaten(clientX, clientY);
    if (aktion.typ === "ziehen") {
      const basis = basisPositionen[aktion.id] ?? { x: 0, y: 0 };
      const ziel = { x: (m.x - verschiebung.x) / skalierung, y: (m.y - verschiebung.y) / skalierung };
      setOffset((o) => ({ ...o, [aktion.id]: { x: ziel.x - basis.x, y: ziel.y - basis.y } }));
    } else if (aktion.typ === "verschieben") {
      setVerschiebung({
        x: aktion.panStart.x + (m.x - aktion.start.x),
        y: aktion.panStart.y + (m.y - aktion.start.y),
      });
    }
  };

  const mausRunter = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      const m = mausKoordinaten(e.clientX, e.clientY);
      setAktion({ typ: "verschieben", start: m, panStart: { ...verschiebung } });
      setAusgewaehlt(null);
      setFokusKante(null);
    }
  };

  const mausLos = () => setAktion(null);

  const klickKnoten = (id: string) => {
    if (aktion?.typ === "ziehen") return;
    if (ausgewaehlt && ausgewaehlt !== id) {
      verknuepfen(ausgewaehlt, id);
    } else {
      setAusgewaehlt((a) => (a === id ? null : id));
      setFokusKante(null);
    }
  };

  const doppelKlickKnoten = (id: string) => {
    router.push(`/bereiche/${id}`);
  };

  const verknuepfen = async (a: string, b: string) => {
    if (!canEdit) return;
    const res = await bereichVerknuepfen(a, b);
    if (res.ok) {
      setAusgewaehlt(null);
      router.refresh();
    } else {
      setMeldung(res.fehler);
      setTimeout(() => setMeldung(null), 3000);
    }
  };

  const entknuepfen = async () => {
    if (!fokusKante || !canEdit) return;
    const res = await bereichEntknuepfen(fokusKante.von, fokusKante.nach);
    if (res.ok) {
      setFokusKante(null);
      router.refresh();
    } else {
      setMeldung(res.fehler);
      setTimeout(() => setMeldung(null), 3000);
    }
  };

  const zoom = (faktor: number) => setSkalierung((s) => Math.min(Math.max(s * faktor, 0.3), 4));

  const ausgewaehlterKnoten = knoten.find((k) => k.id === ausgewaehlt);
  const nachbarn = useMemo(() => {
    if (!ausgewaehlt) return [];
    return kanten
      .filter((k) => k.von === ausgewaehlt || k.nach === ausgewaehlt)
      .map((k) => (k.von === ausgewaehlt ? k.nach : k.von));
  }, [ausgewaehlt, kanten]);

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[70vh] md:h-[calc(100vh-220px)] min-h-[400px]">
      <div
        ref={containerRef}
        className="relative flex-1 rounded-[var(--radius-karte)] border border-linie bg-white overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseMove={(e) => bewegen(e.clientX, e.clientY)}
        onMouseUp={mausLos}
        onMouseLeave={mausLos}
        onMouseDown={mausRunter}
        onTouchMove={(e) => bewegen(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={mausLos}
        onWheel={(e) => zoom(e.deltaY > 0 ? 0.9 : 1.1)}
      >
        <svg width={groesse.breite} height={groesse.hoehe} className="absolute inset-0">
          <g transform={`translate(${groesse.breite / 2 + verschiebung.x}, ${groesse.hoehe / 2 + verschiebung.y}) scale(${skalierung})`}>
            {kanten.map((k) => {
              const von = positionen[k.von];
              const nach = positionen[k.nach];
              if (!von || !nach) return null;
              const aktiv = fokusKante?.von === k.von && fokusKante?.nach === k.nach;
              const ausgewaehltVerbindung = ausgewaehlt && (k.von === ausgewaehlt || k.nach === ausgewaehlt);
              return (
                <g key={`${k.von}-${k.nach}-${k.typ}`}>
                  <line
                    x1={von.x}
                    y1={von.y}
                    x2={nach.x}
                    y2={nach.y}
                    stroke={k.typ === "eltern" ? "#c6cdd2" : "#586a7a"}
                    strokeWidth={aktiv ? 3 : ausgewaehltVerbindung ? 2.5 : 1.5}
                    strokeDasharray={k.typ === "eltern" ? "6,4" : undefined}
                    className="transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFokusKante(k);
                      setAusgewaehlt(null);
                    }}
                  />
                  {k.typ === "explizit" && (
                    <line
                      x1={von.x}
                      y1={von.y}
                      x2={nach.x}
                      y2={nach.y}
                      stroke="transparent"
                      strokeWidth={20}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFokusKante(k);
                        setAusgewaehlt(null);
                      }}
                    />
                  )}
                </g>
              );
            })}
            {knoten.map((k) => {
              const p = positionen[k.id];
              if (!p) return null;
              const selektiert = ausgewaehlt === k.id;
              const nachbar = ausgewaehlt && nachbarn.includes(k.id);
              const radius = k.art === "area" ? 22 : 18;
              return (
                <g
                  key={k.id}
                  transform={`translate(${p.x}, ${p.y})`}
                  className="cursor-pointer"
                  onMouseDown={(e) => startZiehen(k.id, e)}
                  onTouchStart={(e) => startZiehen(k.id, e)}
                  onClick={() => klickKnoten(k.id)}
                  onDoubleClick={() => doppelKlickKnoten(k.id)}
                >
                  <circle
                    r={radius}
                    fill={ART_FARBE[k.art]}
                    stroke={selektiert ? "#25303a" : nachbar ? "#586a7a" : ART_RAND[k.art]}
                    strokeWidth={selektiert ? 4 : 2}
                    className="transition-all"
                  />
                  {k.sichtbarkeit === "privat" && (
                    <circle r={radius - 4} stroke="white" strokeWidth={2} strokeDasharray="3,2" fill="none" />
                  )}
                  <text
                    y={radius + 16}
                    textAnchor="middle"
                    className="text-[12px] font-medium select-none pointer-events-none"
                    style={{ fill: "var(--color-tinte)" }}
                  >
                    {k.name}
                  </text>
                  {selektiert && (
                    <text y={radius + 30} textAnchor="middle" className="text-[10px] select-none pointer-events-none" fill="#56636f">
                      Klick auf anderen Bereich zum Verknüpfen
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button onClick={() => zoom(1.2)} className="knopf knopf-rand !min-h-9 !w-9 !p-0" aria-label="Vergrößern">
            <IconPlus groesse={18} />
          </button>
          <button onClick={() => zoom(0.83)} className="knopf knopf-rand !min-h-9 !w-9 !p-0" aria-label="Verkleinern">
            <IconX groesse={18} />
          </button>
        </div>

        {meldung && (
          <div className="absolute bottom-3 left-3 right-3 md:right-auto md:max-w-sm rounded-xl bg-signal/10 text-signal px-4 py-2 text-sm">
            {meldung}
          </div>
        )}
      </div>

      <aside className="md:w-72 shrink-0 space-y-4">
        <div className="karte p-4">
          <h2 className="text-[16px] font-normal mb-3">Legende</h2>
          <ul className="space-y-2 text-sm">
            {(["area", "projekt", "ressource", "archiv"] as const).map((art) => (
              <li key={art} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: ART_FARBE[art] }} />
                <span className="flex-1">{BEREICH_NAME[art]}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 pt-1">
              <span className="h-px w-4 bg-nebel" />
              <span>Eltern-Kind</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-px w-4 bg-schiefer" />
              <span>Explizite Verknüpfung</span>
            </li>
          </ul>
        </div>

        {ausgewaehlterKnoten && (
          <div className="karte p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="etikett">{BEREICH_NAME[ausgewaehlterKnoten.art]}</p>
                <p className="font-medium text-[16px]">{ausgewaehlterKnoten.name}</p>
              </div>
              <button onClick={() => setAusgewaehlt(null)} className="text-leise hover:text-tinte">
                <IconX groesse={18} />
              </button>
            </div>
            <p className="mt-3 text-[13px] text-leise">
              Klicke auf einen anderen Bereich, um eine Verknüpfung zu erstellen.
            </p>
            <button
              onClick={() => doppelKlickKnoten(ausgewaehlterKnoten.id)}
              className="mt-3 knopf knopf-still !min-h-9 w-full"
            >
              Bereich öffnen
            </button>
          </div>
        )}

        {fokusKante && (
          <div className="karte p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-[16px]">
                {fokusKante.typ === "eltern" ? "Eltern-Kind-Verknüpfung" : "Explizite Verknüpfung"}
              </p>
              <button onClick={() => setFokusKante(null)} className="text-leise hover:text-tinte">
                <IconX groesse={18} />
              </button>
            </div>
            <p className="mt-2 text-[13px] text-leise">
              {knoten.find((k) => k.id === fokusKante.von)?.name} ↔ {knoten.find((k) => k.id === fokusKante.nach)?.name}
            </p>
            {fokusKante.typ === "explizit" && canEdit && (
              <button onClick={entknuepfen} className="mt-3 knopf knopf-rand text-signal border-signal/30 !min-h-9 w-full">
                <IconMuell groesse={16} /> Verknüpfung lösen
              </button>
            )}
          </div>
        )}

        {!ausgewaehlt && !fokusKante && (
          <div className="karte p-4 text-[13px] text-leise space-y-2">
            <p>Tippe auf einen Bereich, um ihn auszuwählen und mit einem anderen zu verknüpfen.</p>
            <p>Doppelklick öffnet den Bereich. Ziehen verschiebt, Scrollen zoomt.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
