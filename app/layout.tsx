import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { RegisterServiceWorker } from "./register-sw";

export const metadata: Metadata = {
  title: "Plant Care",
  description: "Personal plant care scheduler",
  appleWebApp: { capable: true, title: "Plant Care", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#166534",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-green-50 text-gray-900 antialiased">
        <RegisterServiceWorker />
        <div className="mx-auto max-w-2xl px-4 pb-24">
          <header className="flex items-center justify-between py-4">
            <Link href="/" className="text-xl font-bold text-green-800">
              🪴 Plant Care
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-green-700">
              <Link href="/" className="hover:underline">
                Today
              </Link>
              <Link href="/plants" className="hover:underline">
                Plants
              </Link>
              <Link
                href="/plants/new"
                className="rounded-full bg-green-700 px-3 py-1 text-white hover:bg-green-800"
              >
                + Add
              </Link>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
