import { beforeEach, describe, expect, it } from "vitest";
import { DemoRepo, demoZuruecksetzen } from "@/lib/data/demo-repo";

describe("Mindmap-Daten und Bereichsverknüpfungen", () => {
  beforeEach(() => demoZuruecksetzen());

  it("liefert sichtbare Bereiche als Knoten und Eltern-Kind-Kanten", async () => {
    const repo = new DemoRepo();
    const daten = await repo.mindmapDaten();
    expect(daten.knoten.some((k) => k.id === "p-hockey")).toBe(true);
    expect(daten.kanten.some((k) => k.von === "a-sport" && k.nach === "p-hockey" && k.typ === "eltern")).toBe(true);
  });

  it("zeigt private Bereiche nur der Besitzerin", async () => {
    const olivia = new DemoRepo("u-olivia");
    const ralph = new DemoRepo("u-ralph");
    const oliviaDaten = await olivia.mindmapDaten();
    const ralphDaten = await ralph.mindmapDaten();
    expect(oliviaDaten.knoten.some((k) => k.id === "p-plattform")).toBe(true);
    expect(ralphDaten.knoten.some((k) => k.id === "p-plattform")).toBe(false);
  });

  it("legt explizite Bereichsverknüpfungen an und löst sie", async () => {
    const repo = new DemoRepo();
    await repo.bereichVerknuepfen("p-hockey", "p-ausbildung");
    let daten = await repo.mindmapDaten();
    expect(daten.kanten.some((k) => k.typ === "explizit" && k.von === "p-hockey" && k.nach === "p-ausbildung")).toBe(true);

    await repo.bereichEntknuepfen("p-hockey", "p-ausbildung");
    daten = await repo.mindmapDaten();
    expect(daten.kanten.some((k) => k.typ === "explizit" && k.von === "p-hockey" && k.nach === "p-ausbildung")).toBe(false);
  });

  it("ignoriert doppelte Verknüpfungen und Selbstverknüpfungen", async () => {
    const repo = new DemoRepo();
    const vorher = (await repo.mindmapDaten()).kanten.filter((k) => k.typ === "explizit").length;
    await repo.bereichVerknuepfen("p-hockey", "p-ausbildung");
    await repo.bereichVerknuepfen("p-ausbildung", "p-hockey");
    const daten = await repo.mindmapDaten();
    const explizit = daten.kanten.filter((k) => k.typ === "explizit" && ((k.von === "p-hockey" && k.nach === "p-ausbildung") || (k.von === "p-ausbildung" && k.nach === "p-hockey")));
    expect(explizit.length).toBe(1);
    expect(daten.kanten.filter((k) => k.typ === "explizit").length).toBe(vorher);

    await repo.bereichVerknuepfen("p-hockey", "p-hockey");
    expect((await repo.mindmapDaten()).kanten.filter((k) => k.typ === "explizit").length).toBe(vorher);
  });

  it("filtert Bereichsverknüpfungen nach Bereich", async () => {
    const repo = new DemoRepo();
    await repo.bereichVerknuepfen("a-meducation", "x-archiv");
    const meducation = await repo.bereichVerknuepfungen("a-meducation");
    expect(meducation.length).toBe(1);
    expect(meducation[0].a).toBe("a-meducation");
    expect(meducation[0].b).toBe("x-archiv");
  });
});
