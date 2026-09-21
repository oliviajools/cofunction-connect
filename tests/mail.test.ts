import { beforeEach, describe, expect, it } from "vitest";
import { ausPostmark, mailAnnehmen, sichererDateiname } from "@/lib/mail";
import { DemoRepo, demoZuruecksetzen } from "@/lib/data/demo-repo";

const postmark = (extra: Record<string, unknown> = {}) => ({
  FromFull: { Email: "Ralph@Example.org", Name: "Ralph" },
  To: "wissen+hockey@cofunction.de",
  ToFull: [{ Email: "wissen+hockey@cofunction.de", MailboxHash: "hockey" }],
  Subject: "Studie Sprunggelenk #studie",
  TextBody: "Anbei die Studie.",
  MessageID: "abc-123",
  Attachments: [{ Name: "Studie Ä.pdf", ContentType: "application/pdf", Content: Buffer.from("%PDF-1.4 test").toString("base64") }],
  ...extra,
});

describe("Mail-Adapter", () => {
  beforeEach(() => demoZuruecksetzen());

  it("übersetzt Postmark in das neutrale Format", () => {
    const m = ausPostmark(postmark());
    expect(m.absender).toBe("ralph@example.org");
    expect(m.zusatz).toBe("hockey");
    expect(m.anhaenge).toHaveLength(1);
    expect(new TextDecoder().decode(m.anhaenge[0].daten)).toBe("%PDF-1.4 test");
  });

  it("liest den Plus-Zusatz notfalls aus der Adresse", () => {
    const m = ausPostmark(postmark({ ToFull: [], MailboxHash: "", OriginalRecipient: "wissen+ausbildung@cofunction.de" }));
    expect(m.zusatz).toBe("ausbildung");
  });

  it("legt Mail + Anhang im richtigen Bereich an und setzt Betreff-Tags", async () => {
    const repo = new DemoRepo("u-ralph");
    const r = await mailAnnehmen(ausPostmark(postmark()), await repo.profile(), async (id) => new DemoRepo(id));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bereich).toBe("Leistungsstützpunkt Hockey");
    const haupt = await repo.eintrag(r.eintragIds[0]);
    expect(haupt?.bereichId).toBe("p-hockey");
    expect(haupt?.tags.map((t) => t.name)).toEqual(["studie"]);
    const anhang = await repo.eintrag(r.eintragIds[1]);
    expect(anhang?.elternId).toBe(haupt?.id);
    expect(anhang?.dateiPfad).toMatch(/^u-ralph\/\d{4}\/.+-Studie-A\.pdf$/);
  });

  it("ohne Zusatz landet die Mail im Eingang", async () => {
    const repo = new DemoRepo("u-ralph");
    const r = await mailAnnehmen(ausPostmark(postmark({ ToFull: [{ Email: "wissen@cofunction.de" }], To: "wissen@cofunction.de" })), await repo.profile(), async (id) => new DemoRepo(id));
    expect(r.ok && (await repo.eintrag(r.eintragIds[0]))?.bereichId).toBe(null);
  });

  it("private Bereiche anderer Personen sind kein gültiges Ziel", async () => {
    const repo = new DemoRepo("u-ralph");
    const r = await mailAnnehmen(ausPostmark(postmark({ ToFull: [{ Email: "x", MailboxHash: "plattform" }] })), await repo.profile(), async (id) => new DemoRepo(id));
    expect(r.ok && r.bereich).toBe(null);
  });

  it("lehnt unbekannte Absender ab", async () => {
    const repo = new DemoRepo();
    const r = await mailAnnehmen(ausPostmark(postmark({ FromFull: { Email: "fremd@example.com" } })), await repo.profile(), async (id) => new DemoRepo(id));
    expect(r.ok).toBe(false);
  });

  it("macht Dateinamen sicher", () => {
    expect(sichererDateiname("../../etc/passwd")).toBe("..-..-etc-passwd");
    expect(sichererDateiname("Übersicht Q3 (final).pdf")).toBe("Ubersicht-Q3-final-.pdf");
  });
});
