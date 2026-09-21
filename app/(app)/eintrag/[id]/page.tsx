import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { ART_NAME, BEREICH_NAME, datumLang, dauer, groesse, minutenSeit, STATUS_TEXT } from "@/lib/format";
import { ArtSymbol, EintragZeile, StatusMarke } from "@/components/bausteine";
import { AudioSpieler } from "@/components/audio-spieler";
import { EintragAktionen, InhaltEditor, Protokoll, TagEditor, Transkript, Verknuepfungen } from "@/components/eintrag-werkzeuge";
import { IconDatei, IconSchloss, IconZurueck } from "@/components/icons";

export const maxDuration = 300;

export async function generateMetadata(props: PageProps<"/eintrag/[id]">) {
  const { id } = await props.params;
  const e = await (await getRepo()).eintrag(id);
  return { title: e?.titel || "Eintrag" };
}

export default async function EintragSeite(props: PageProps<"/eintrag/[id]">) {
  const { id } = await props.params;
  const repo = await getRepo();
  const e = await repo.eintrag(id);
  if (!e) notFound();

  const [bereiche, verknuepft, kinder, protokoll, eltern, audioUrl, dateiUrl] = await Promise.all([
    repo.bereiche(),
    repo.verknuepfungen(id),
    repo.eintraege({ elternId: id }),
    e.art === "meeting" ? repo.protokoll(id) : Promise.resolve([]),
    e.elternId ? repo.eintrag(e.elternId) : Promise.resolve(null),
    e.audioPfad ? repo.dateiUrl(e.audioPfad) : Promise.resolve(null),
    e.dateiPfad ? repo.dateiUrl(e.dateiPfad) : Promise.resolve(null),
  ]);
  const optionen = bereiche.filter((b) => b.aktiv || b.id === e.bereichId).map((b) => ({ id: b.id, name: b.name, art: b.art }));
  const zurueck = e.bereichId ? `/bereiche/${e.bereichId}` : "/eingang";
  const meeting = e.art === "meeting";
  const segmente = e.transkript ?? [];
  const minutenAlt = minutenSeit(e.aktualisiertAm);
  const kannVerarbeiten =
    !!(e.audioPfad || e.dateiPfad) && (e.status === "fehler" || e.status === "ohne_transkription" || (e.status === "verarbeitung" && minutenAlt > 10));
  const bausteine = kinder.filter((k) => k.art === "baustein");
  const anhaenge = kinder.filter((k) => k.art !== "baustein");

  return (
    <div>
      <Link href={zurueck} className="inline-flex items-center gap-1.5 text-[14px] text-schiefer-dunkel hover:underline mb-5">
        <IconZurueck groesse={16} /> {e.bereich ? e.bereich.name : "Eingang"}
      </Link>

      <div className="flex items-center gap-3 mb-3">
        <ArtSymbol art={e.art} />
        <div className="etikett flex flex-wrap items-center gap-x-2">
          <span>{ART_NAME[e.art]}</span>
          {e.bereich && <span>· {BEREICH_NAME[e.bereich.art]}</span>}
          {e.sichtbarkeit === "privat" && (
            <span className="inline-flex items-center gap-1">
              · <IconSchloss groesse={13} /> nur für dich
            </span>
          )}
        </div>
        <StatusMarke status={e.status} fehler={e.fehler} />
      </div>

      <p className="text-[13px] text-leise mb-5">
        {e.ersteller?.name} · {datumLang(e.erstelltAm)}
        {typeof e.meta.dauer === "number" ? ` · ${dauer(e.meta.dauer as number)} Min.` : ""}
        {e.quelle === "mail" ? ` · per Mail${typeof e.meta.absender === "string" ? ` von ${e.meta.absender}` : ""}` : ""}
        {e.quelle === "upload" ? " · hochgeladen" : ""}
      </p>

      {e.status !== "bereit" && (
        <div className={`mb-6 rounded-2xl px-4 py-3 text-[14px] ${e.status === "fehler" ? "bg-[#f6e3de] text-signal" : "bg-sand text-sand-tinte"}`}>
          <strong className="font-semibold">{STATUS_TEXT[e.status]}</strong>
          {e.status === "verarbeitung" && " – Transkription und Regelwerk laufen. Seite in einem Moment neu laden."}
          {e.status === "ohne_transkription" && " – Die Aufnahme ist gespeichert. Sobald ein Mistral-Schlüssel hinterlegt ist, kannst du sie hier transkribieren lassen."}
          {e.status === "fehler" && e.fehler && ` – ${e.fehler}`}
        </div>
      )}

      {eltern && (
        <p className="mb-5 text-[14px]">
          Teil von{" "}
          <Link href={`/eintrag/${eltern.id}`} className="underline underline-offset-2">
            {eltern.titel}
          </Link>
          {typeof e.meta.von === "number" && ` (ab ${dauer(e.meta.von as number)})`}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {meeting ? (
            <>
              <section className="karte p-5 md:p-7">
                <InhaltEditor id={e.id} titel={e.titel} inhalt={e.inhalt} nurTitel />
              </section>
              <div className="grid gap-6 xl:grid-cols-2">
                <section className="karte p-5 md:p-7" aria-label="Protokoll">
                  <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-[22px] font-light">Protokoll</h2>
                    <span className="tag">von Hand</span>
                  </div>
                  <Protokoll eintragId={e.id} punkte={protokoll} />
                  <div className="mt-7">
                    <h2 className="etikett">Wissensbausteine</h2>
                    <ul className="mt-2 space-y-2">
                      {bausteine.map((b) => (
                        <li key={b.id}>
                          <Link href={`/eintrag/${b.id}`} className="block rounded-2xl bg-grund border border-linie p-3 hover:border-schiefer-hell">
                            <span className="block text-[14px] font-medium">{b.titel}</span>
                            <span className="block text-[12px] text-leise mt-0.5">
                              {typeof b.meta.von === "number" ? `ab ${dauer(b.meta.von as number)} · ` : ""}
                              {b.tags.map((t) => `#${t.name}`).join(" ")}
                            </span>
                          </Link>
                        </li>
                      ))}
                      {bausteine.length === 0 && <li className="text-[13px] text-leise">Markiere im Transkript eine Stelle, um einen Baustein anzulegen.</li>}
                    </ul>
                  </div>
                </section>
                <section className="karte p-5 md:p-7" aria-label="Transkript">
                  <div className="flex items-baseline justify-between mb-4">
                    <h2 className="text-[22px] font-light">Transkript</h2>
                    <span className="tag">automatisch</span>
                  </div>
                  {segmente.length ? (
                    <Transkript eintragId={e.id} segmente={segmente} audioUrl={audioUrl} bausteineErlaubt />
                  ) : (
                    <>
                      {audioUrl && <AudioSpieler src={audioUrl} />}
                      <p className="mt-3 text-[14px] text-leise">{e.status === "verarbeitung" ? "Wird transkribiert …" : "Kein Transkript vorhanden."}</p>
                    </>
                  )}
                </section>
              </div>
            </>
          ) : (
            <section className="karte p-5 md:p-7 space-y-5">
              <InhaltEditor
                id={e.id}
                titel={e.titel}
                inhalt={e.inhalt}
                platzhalter={e.status === "verarbeitung" ? "Text wird gewonnen …" : "Noch kein Inhalt."}
              />
              {audioUrl && <AudioSpieler src={audioUrl} />}
              {segmente.length > 1 && new Set(segmente.map((s) => s.sprecher)).size > 1 && (
                <details className="rounded-2xl border border-linie p-4">
                  <summary className="cursor-pointer text-[14px] font-medium">Transkript mit Zeitmarken</summary>
                  <div className="mt-4">
                    <Transkript eintragId={e.id} segmente={segmente} audioUrl={null} bausteineErlaubt={false} />
                  </div>
                </details>
              )}
              {e.dateiName && (
                <div className="flex items-center gap-3 rounded-2xl bg-grund border border-linie p-3.5">
                  <IconDatei groesse={22} className="text-schiefer shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium truncate">{e.dateiName}</p>
                    <p className="text-[12px] text-leise">{groesse(e.meta.groesse as number)}</p>
                  </div>
                  {dateiUrl ? (
                    <a href={dateiUrl} target="_blank" rel="noopener noreferrer" className="knopf knopf-rand !min-h-10">
                      Öffnen
                    </a>
                  ) : (
                    e.dateiPfad === null && !e.audioPfad && <span className="text-[12px] text-leise">Beispieldatei</span>
                  )}
                </div>
              )}
            </section>
          )}

          {anhaenge.length > 0 && (
            <section className="karte px-5 md:px-7 py-4">
              <h2 className="text-[18px] font-normal mb-1">Anhänge</h2>
              <ul>
                {anhaenge.map((k) => (
                  <EintragZeile key={k.id} e={k} zeigeBereich={false} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="karte p-5">
            <EintragAktionen
              id={e.id}
              bereichId={e.bereichId}
              sichtbarkeit={e.sichtbarkeit}
              optionen={optionen}
              zurueck={zurueck}
              kannVerarbeiten={kannVerarbeiten}
            />
          </section>
          <section className="karte p-5">
            <h2 className="text-[18px] font-normal mb-3">Tags</h2>
            <TagEditor id={e.id} tags={e.tags} />
          </section>
          <section className="karte p-5">
            <h2 className="text-[18px] font-normal mb-3">Verknüpft mit</h2>
            <Verknuepfungen id={e.id} liste={verknuepft.map((v) => ({ id: v.id, titel: v.titel, bereich: v.bereich?.name ?? "Eingang" }))} />
          </section>
        </aside>
      </div>
    </div>
  );
}
