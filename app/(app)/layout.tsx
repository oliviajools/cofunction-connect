import Link from "next/link";
import { getRepo } from "@/lib/data";
import { Logo } from "@/components/logo";
import { KopfNav } from "@/components/kopf-nav";
import { MobilLeiste } from "@/components/mobil-leiste";
import { IconMikro } from "@/components/icons";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const repo = await getRepo();
  const [nutzer, eingang] = await Promise.all([repo.nutzer(), repo.eingangAnzahl()]);

  return (
    <div className="min-h-dvh flex flex-col">
      {repo.modus === "demo" && (
        <div className="bg-sand text-sand-tinte text-[13px] text-center px-4 py-1.5">
          Demo-Modus: Beispieldaten im Speicher, nichts wird dauerhaft gespeichert.{" "}
          <Link href="/konto" className="underline underline-offset-2">
            Mehr
          </Link>
        </div>
      )}
      <header className="bg-schiefer text-white rounded-b-[28px] md:rounded-b-[var(--radius-band)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-[1280px] px-5 md:px-10 h-[68px] md:h-[88px] flex items-center gap-6">
          <Link href="/" className="shrink-0" aria-label="CoFunction – zur Übersicht">
            <span className="md:hidden">
              <Logo klein />
            </span>
            <span className="hidden md:inline">
              <Logo />
            </span>
          </Link>
          <div className="flex-1" />
          <KopfNav eingang={eingang} />
          <Link
            href="/erfassen"
            className="hidden md:inline-flex knopf bg-white text-schiefer-tief hover:bg-dunst !min-h-10 !px-4 text-[14px]"
          >
            <IconMikro groesse={18} /> Erfassen
          </Link>
          <Link
            href="/konto"
            aria-label={`Konto von ${nutzer.name}`}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-nebel text-[13px] font-semibold hover:border-white"
          >
            {nutzer.kuerzel}
          </Link>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-[1280px] px-4 md:px-10 pt-6 md:pt-10 pb-28 md:pb-16">{children}</main>
      <MobilLeiste eingang={eingang} />
    </div>
  );
}
