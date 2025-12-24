import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MainHeader } from "@/components/layout/main-header";
import { MainFooter } from "@/components/layout/main-footer";
import { AuthModalProvider } from "@/components/auth/auth-modal-provider";
import { AuthModalHost } from "@/components/auth/auth-modal-host";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ScrollRestorationProvider } from "@/app/scroll-restoration-provider";
import { getCurrentUser } from "@/lib/auth/currentUser";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ⚡ SSR: Load user once on server (eliminates 3× client-side /api/auth/me calls)
  // This runs on every page navigation but is fast (JWT decode + 1 DB query)
  const currentUser = await getCurrentUser();
  
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-[#F9FAFB] text-foreground antialiased">
        <ScrollRestorationProvider>
          <AuthProvider initialUser={currentUser}>
            <AuthModalProvider>
              <div className="flex min-h-screen flex-col">
                <MainHeader />
                <main className="flex-1">{children}</main>
                <MainFooter />
                <Toaster />
                <AuthModalHost />
              </div>
            </AuthModalProvider>
          </AuthProvider>
        </ScrollRestorationProvider>
      </body>
    </html>
  );
}
