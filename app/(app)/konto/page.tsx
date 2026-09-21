import { getRepo } from "@/lib/data";
import { istDemo, mailAdresse, mailWebhookGeheimnis, mistralSchluessel, supabaseGeheimerSchluessel } from "@/lib/config";
import { abmelden, demoNutzerWechseln } from "@/app/aktionen";
import { Seitenkopf } from "@/components/bausteine";
import { IconExport } from "@/components/icons";

export const metadata = { title: "Konto" };

function Status({ an, text, hinweis }: { an: boolean; text: string; hinweis: string }) {
  return (
    <li className="flex items-start gap-3 py-3 border-t border-linie first:border-t-0">
      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${an ? "bg-[#3f7a5a]" : "bg-nebel"}`} aria-hidden="true" />
      <span className="flex-1">
        <span className="block text-[15px]">{text}</span>
        <span className="block text-[13px] text-leise">{hinweis}</span>
      </span>
      <span className={`text-[12px] font-semibold ${an ? "text-[#3f7a5a]" : "text-leise"}`}>{an ? "aktiv" : "fehlt"}</span>
    </li>
  );
}

export default async function Konto() {
  const repo = await getRepo();
  const [nutzer, profile] = await Promise.all([repo.nutzer(), repo.profile()]);

  return (
    <div className="max-w-3xl">
      <Seitenkopf titel="Konto" unter={`Angemeldet als ${nutzer.name} (${nutzer.email})`} />
      <div className="space-y-6">
        <section className="karte p-5 md:p-7">
          <h2 className="text-[22px] font-light mb-2">Team</h2>
          <ul>
            {profile.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3 border-t border-linie first:border-t-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-schiefer text-white text-[13px] font-semibold">{p.kuerzel}</span>
                <span className="flex-1">
                  <span className="block text-[15px]">{p.name}</span>
                  <span className="block text-[13px] text-leise">{p.email}</span>
                </span>
                <span className="text-[12px] text-leise">{p.rolle === "admin" ? "Admin" : "Mitglied"}</span>
                {istDemo && p.id !== nutzer.id && (
                  <form action={demoNutzerWechseln.bind(null, p.id)}>
                    <button className="knopf knopf-still !min-h-9 !text-[13px]">Als {p.name.split(" ")[0]} ansehen</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {!istDemo && (
            <p className="mt-3 text-[13px] text-leise">Neue Personen lädst du im Supabase-Dashboard unter Authentication → Users → „Invite user“ ein.</p>
          )}
        </section>

        <section className="karte p-5 md:p-7">
          <h2 className="text-[22px] font-light mb-2">Dienste</h2>
          <ul>
            <Status an={!istDemo} text="Datenbank & Anmeldung (Supabase)" hinweis={istDemo ? "Demo-Modus: Daten nur im Speicher." : "Verbunden."} />
            <Status an={!!mistralSchluessel()} text="Transkription (Mistral Voxtral)" hinweis="Ohne Schlüssel werden Aufnahmen gespeichert, aber nicht transkribiert." />
            <Status
              an={!istDemo && !!supabaseGeheimerSchluessel() && !!mailWebhookGeheimnis()}
              text={`Mail-Eingang (${mailAdresse()})`}
              hinweis="Braucht den geheimen Supabase-Schlüssel, ein Webhook-Geheimnis und einen Inbound-Mail-Dienst."
            />
          </ul>
        </section>

        <section className="karte p-5 md:p-7">
          <h2 className="text-[22px] font-light mb-2">Export</h2>
          <p className="text-[14px] text-leise mb-4">
            Alle für dich sichtbaren Einträge als Markdown-Dateien mit Metadaten – lesbar in jedem Editor, importierbar in Obsidian oder Notion. Kein Lock-in.
          </p>
          <a href="/api/export" className="knopf knopf-rand">
            <IconExport groesse={18} /> Export herunterladen (.zip)
          </a>
        </section>

        <form action={abmelden}>
          <button className="knopf knopf-still">Abmelden</button>
        </form>
      </div>
    </div>
  );
}
