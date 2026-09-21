import type { Metadata, Viewport } from "next";
import "@fontsource-variable/figtree";
import "@fontsource-variable/league-spartan";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CoFunction Wissen", template: "%s · CoFunction Wissen" },
  description: "Die Wissensplattform von CoFunction – Medizin, Performance, Meducation.",
  applicationName: "CoFunction Wissen",
  appleWebApp: { capable: true, title: "CoFunction", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#586a7a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
