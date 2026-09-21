import { beforeEach, describe, expect, it } from "vitest";
import { DemoRepo, demoZuruecksetzen } from "@/lib/data/demo-repo";
import { eintragAlsMarkdown } from "@/lib/export";

describe("Sichtbarkeit und Zuordnung (Demo-Repo spiegelt die RLS-Regeln)", () => {
  beforeEach(() => demoZuruecksetzen());

  it("private Einträge und Bereiche sieht nur die Besitzerin", async () => {
    const olivia = new DemoRepo("u-olivia");
    const ralph = new DemoRepo("u-ralph");
    expect(await olivia.bereich("p-plattform")).not.toBeNull();
    expect(await ralph.bereich("p-plattform")).toBeNull();
    expect(await ralph.eintrag("e-plattform-idee")).toBeNull();
    expect((await ralph.eintraege()).some((e) => e.sichtbarkeit === "privat")).toBe(false);
  });

  it("Zuordnen verschiebt auch Kinder und wird protokolliert", async () => {
    const repo = new DemoRepo();
    const mail = await repo.eintragAnlegen({ art: "mail", titel: "m" });
    const anhang = await repo.eintragAnlegen({ art: "datei", titel: "a", elternId: mail.id });
    const vorher = await repo.eingangAnzahl();
    await repo.zuordnen(mail.id, "p-hockey");
    expect((await repo.eintrag(anhang.id))?.bereichId).toBe("p-hockey");
    expect(await repo.eingangAnzahl()).toBe(vorher - 1);
  });

  it("exportiert Markdown mit Metadaten", async () => {
    const repo = new DemoRepo();
    const e = (await repo.eintrag("e-kickoff"))!;
    const md = eintragAlsMarkdown(e, await repo.protokoll("e-kickoff"));
    expect(md).toMatch(/^---\nid: "e-kickoff"/);
    expect(md).toContain("## Entscheidungen");
    expect(md).toContain("- [ ] Testauswahl für die Eingangsdiagnostik festlegen (Ralph K.)");
    expect(md).toContain("## Transkript");
  });
});
