import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { MainHeader } from "@/components/layout/main-header";
import { MainFooter } from "@/components/layout/main-footer";
import { AuthModalProvider } from "@/components/auth/auth-modal-provider";
import { AuthModalHost } from "@/components/auth/auth-modal-host";
import { ScrollRestorationProvider } from "@/app/scroll-restoration-provider";
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
        
        {/* Telegram Login Widget - загружается ОДИН РАЗ глобально */}
        <Script
          src="https://telegram.org/js/telegram-widget.js?22"
          strategy="lazyOnload"
          onLoad={() => {
            if (process.env.NODE_ENV === 'development') {
              console.log('[telegram] Widget script loaded globally ✅');
            }
          }}
          onError={(e: Error) => {
            console.error('[telegram] Failed to load widget script:', e);
          }}
        />
      </body>
    </html>
  );
}
