import { describe, expect, it } from "vitest";
import { begriffeAusEingabe, betreffOhneTags, betreffTags, fachvokabular, slugAus, tagName, wendeRegelnAn } from "@/lib/regeln";
import type { Regel } from "@/lib/data/types";

const regeln: Regel[] = [
  { id: "1", begriffe: ["Knie"], tag: "knie", aktiv: true },
  { id: "2", begriffe: ["Belastung", "Ermüdung"], tag: "belastung", aktiv: true },
  { id: "3", begriffe: ["Hockey"], tag: "hockey", aktiv: true },
  { id: "4", begriffe: ["Propriozept*"], tag: "propriozeption", aktiv: true },
  { id: "5", begriffe: ["Schulter"], tag: "schulter", aktiv: false },
];

describe("Regelwerk", () => {
  it("findet Begriffe unabhängig von Groß-/Kleinschreibung und in Komposita", () => {
    const t = wendeRegelnAn("Nach der Sprungserie beim HOCKEY mehr Ausweichbewegung in der Kniebeuge, vermutlich Ermüdung.", regeln);
    expect(t.map((x) => x.tag)).toEqual(["belastung", "hockey", "knie"]);
    expect(t.find((x) => x.tag === "belastung")?.wort).toBe("ermüdung");
  });

  it("ist deterministisch: gleicher Text, gleiches Ergebnis", () => {
    const text = "Propriozeptives Training bei Belastung";
    expect(wendeRegelnAn(text, regeln)).toEqual(wendeRegelnAn(text, regeln));
    expect(wendeRegelnAn(text, [...regeln].reverse()).map((x) => x.tag)).toEqual(wendeRegelnAn(text, regeln).map((x) => x.tag));
  });

  it("ignoriert inaktive Regeln und liefert leer, wenn nichts greift", () => {
    expect(wendeRegelnAn("Schulter", regeln)).toEqual([]);
  });

  it("normalisiert Tag-Namen", () => {
    expect(tagName("#Kinder Jugend")).toBe("kinder-jugend");
    expect(tagName("  ##Knie!  ")).toBe("knie");
    expect(tagName("#")).toBe("");
  });

  it("liest #tags aus dem Betreff", () => {
    expect(betreffTags("Studie Knie #Hockey #reha #hockey")).toEqual(["hockey", "reha"]);
    expect(betreffOhneTags("Studie Knie #Hockey #reha")).toBe("Studie Knie");
  });

  it("bildet Kurznamen für Mail-Adressen", () => {
    expect(slugAus("Leistungsstützpunkt Hockey")).toBe("leistungsstuetzpunkt-hockey");
    expect(slugAus("Größe & Maß")).toBe("groesse-mass");
  });

  it("zerlegt Begriffe-Eingaben", () => {
    expect(begriffeAusEingabe("Knie, Kniegelenk; Meniskus\nKnie, x")).toEqual(["Knie", "Kniegelenk", "Meniskus"]);
  });

  it("liefert Fachvokabular nur aus aktiven Regeln", () => {
    expect(fachvokabular(regeln)).toEqual(["Knie", "Belastung", "Ermüdung", "Hockey", "Propriozept"]);
  });
});
