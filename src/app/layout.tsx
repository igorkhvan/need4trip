import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MainHeader } from "@/components/layout/main-header";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Need4Trip",
  description: "Организация оффроуд-событий и регистрация участников",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col bg-muted/20">
          <MainHeader />
          <main className="flex-1 py-10">
            <div className="page-container">{children}</div>
          </main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            Need4Trip · бета-версия ·{" "}
            <a className="underline-offset-4 hover:underline" href="mailto:hello@need4trip.app">
              Связаться с нами
            </a>
          </footer>
          <Toaster />
        </div>
      </body>
    </html>
  );
}
