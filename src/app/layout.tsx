import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MainHeader } from "@/components/layout/main-header";
import { MainFooter } from "@/components/layout/main-footer";
import { AuthModalProvider } from "@/components/auth/auth-modal-provider";
import { AuthModalHost } from "@/components/auth/auth-modal-host";
import { BillingModalHost } from "@/components/billing/BillingModalHost";
import { SuspendedAccountProvider } from "@/components/suspended/SuspendedAccountProvider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ScrollRestorationProvider } from "@/app/scroll-restoration-provider";
import { getCurrentUser } from "@/lib/auth/currentUser";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://need4trip.kz"),
  title: {
    default: "Need4Trip",
    template: "%s | Need4Trip",
  },
  description: "Организация оффроуд-событий и регистрация участников",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Need4Trip",
    title: "Need4Trip",
    description: "Организация оффроуд-событий и регистрация участников",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Need4Trip — Организация автомобильных событий",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Need4Trip",
    description: "Организация оффроуд-событий и регистрация участников",
    images: ["/og-default.png"],
  },
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
              <SuspendedAccountProvider>
                <BillingModalHost>
                  <div className="flex min-h-screen flex-col">
                    <MainHeader />
                    <main className="flex-1">{children}</main>
                    <MainFooter />
                    <Toaster />
                    <FeedbackWidget />
                    <AuthModalHost />
                  </div>
                </BillingModalHost>
              </SuspendedAccountProvider>
            </AuthModalProvider>
          </AuthProvider>
        </ScrollRestorationProvider>
      </body>
    </html>
  );
}
