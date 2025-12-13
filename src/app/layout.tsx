import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MainHeader } from "@/components/layout/main-header";
import { MainFooter } from "@/components/layout/main-footer";
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
      <body className="min-h-screen bg-[#F9FAFB] text-foreground antialiased">
        <div className="flex min-h-screen flex-col">
          <MainHeader />
          <main className="flex-1">
            <div className="page-container py-10">{children}</div>
          </main>
          <MainFooter />
          <Toaster />
        </div>
      </body>
    </html>
  );
}
