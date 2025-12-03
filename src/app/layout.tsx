import type { Metadata } from "next";
import { MainHeader } from "@/components/layout/main-header";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Need4Trip",
  description: "Организация оффроуд-ивентов и регистрация участников",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col bg-muted/20">
          <MainHeader />
          <main className="container flex-1 py-10">{children}</main>
          <footer className="border-t py-6 text-center text-sm text-muted-foreground">
            Need4Trip · MVP каркас
          </footer>
          <Toaster />
        </div>
      </body>
    </html>
  );
}
