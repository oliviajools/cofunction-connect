import Link from "next/link";
import { istDemo } from "@/lib/config";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Anmelden" };

export default function Login() {
  return (
    <div className="min-h-dvh bg-schiefer text-white flex flex-col">
      <header className="mx-auto w-full max-w-[1280px] px-5 md:px-10 h-[88px] flex items-center">
        <Logo />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-5 pb-20 text-center">
        <h1 className="ueberschrift text-[42px] md:text-[72px]">Wissen, das bleibt.</h1>
        <p className="mt-3 text-[16px] md:text-[18px] text-white/80 max-w-lg">Die Wissensplattform von CoFunction – Medizin, Performance, Meducation.</p>
        <div className="mt-10 w-full max-w-sm rounded-[28px] bg-white text-tinte p-6 text-left shadow-xl">
          {istDemo ? (
            <div className="space-y-4">
              <p className="text-[15px]">
                Die App läuft im <strong>Demo-Modus</strong> mit Beispieldaten. Eine Anmeldung ist erst nötig, wenn Supabase verbunden ist.
              </p>
              <Link href="/" className="knopf knopf-voll w-full">
                Zur Demo
              </Link>
            </div>
          ) : (
            <LoginForm />
          )}
        </div>
      </main>
      <footer className="py-6 text-center text-[13px] text-white/70">
        <Link href="/rechtliches" className="hover:underline">
          Impressum & Datenschutz
        </Link>
      </footer>
    </div>
  );
}
