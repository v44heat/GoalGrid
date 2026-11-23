import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { getCurrentProfile } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/constants";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description:
    "A private double round-robin eFootball league: fixtures, results, standings and shareable match cards.",
};

export const viewport: Viewport = {
  themeColor: "#07140e",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  // Suspended or pending accounts are treated as signed out in the UI.
  const user =
    profile && profile.status === "APPROVED"
      ? { username: profile.username, role: profile.role }
      : null;

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <ToastProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-grass focus:px-4 focus:py-2 focus:font-semibold focus:text-turf-950"
          >
            Skip to content
          </a>
          <Navbar user={user} />
          <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-10 outline-none">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
