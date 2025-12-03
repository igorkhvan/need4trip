import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MainHeader } from "@/components/layout/main-header";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OffRoad Hub",
  description: "Организация оффроуд-ивентов и регистрация участников",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <div className="flex min-h-screen flex-col bg-muted/20">
          <MainHeader />
          <main className="container flex-1 py-10">{children}</main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            OffRoad Hub · MVP каркас
          </footer>
          <Toaster />
        </div>
      </body>
    </html>
  );
}
