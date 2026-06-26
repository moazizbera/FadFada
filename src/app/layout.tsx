import type { Metadata, Viewport } from "next";
import { AppShell } from "../components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "FadFada",
  description: "A focused mobile wellbeing companion for calm reflection.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "FadFada",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0E0D10",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AppShell initialLanguage="ar">{children}</AppShell>
      </body>
    </html>
  );
}
