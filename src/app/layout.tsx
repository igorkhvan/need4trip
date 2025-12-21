import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MainHeader } from "@/components/layout/main-header";
import { MainFooter } from "@/components/layout/main-footer";
import { AuthModalProvider } from "@/components/auth/auth-modal-provider";
import { AuthModalHost } from "@/components/auth/auth-modal-host";
import { ScrollRestorationProvider } from "@/app/scroll-restoration-provider";
import { TelegramScriptLoader } from "@/components/TelegramScriptLoader";
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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-[#F9FAFB] text-foreground antialiased">
        <ScrollRestorationProvider>
          <AuthModalProvider>
            <div className="flex min-h-screen flex-col">
              <MainHeader />
              <main className="flex-1">{children}</main>
              <MainFooter />
              <Toaster />
              <AuthModalHost />
            </div>
          </AuthModalProvider>
        </ScrollRestorationProvider>
        
        {/* Telegram Login Widget - Client Component with observability */}
        <TelegramScriptLoader />
      </body>
    </html>
  );
}
