import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "./register-sw";
import { TabBar, TopBar } from "./nav";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fern — plant care",
  description: "A calm home for your plants.",
  appleWebApp: { capable: true, title: "Fern", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1f4732",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen">
        <RegisterServiceWorker />
        <TopBar />
        <main className="mx-auto max-w-xl px-5 pb-28 pt-2">{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
