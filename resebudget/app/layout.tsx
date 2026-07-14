import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { TripProvider } from "@/components/trip-provider";
import { SwRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "Resebudget",
  description: "Följ reseutgifter mot budget — snabbt nog för glasskiosken.",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "Resebudget", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#faf7f2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="bg-paper font-sans text-ink antialiased">
        <TripProvider>
          <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top)+6px)] pb-[calc(env(safe-area-inset-bottom)+10px)]">
            {children}
          </div>
        </TripProvider>
        <SwRegister />
      </body>
    </html>
  );
}
