import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ToastProvider } from "@/components/ui/toast";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: { default: "Cap", template: "%s · Cap" },
  description: "Avance vers ce qui compte, une semaine à la fois.",
  applicationName: "Cap",
  appleWebApp: { capable: true, title: "Cap", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#121715" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Le nonce de la CSP (posé par proxy.ts) rend toutes les pages dynamiques.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="fr" className={nunito.variable} suppressHydrationWarning>
      <head>
        {/* Script même origine (aucun code inline) : applique le thème avant le premier rendu. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" nonce={nonce} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <StoreProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </StoreProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
