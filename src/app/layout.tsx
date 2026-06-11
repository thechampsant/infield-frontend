import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import "@/styles/infield-1529.css";
import "@/styles/infield-1948.css";
import "@/styles/infield-1536.css";
import "@/styles/infield-1535.css";
import "@/styles/infield-1956.css";
import "@/styles/infield-claims.css";
import "@/styles/infield-visit.css";
import "@/styles/infield-project-admin.css";
import "@/styles/infield-brand.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { AuthProvider } from "@/lib/auth/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "InField",
  description: "Admin, Account & Project Configuration Platform",
  icons: {
    icon: "/brand/appicon.svg",
    apple: "/brand/appicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} antialiased text-slate-900 dark:text-slate-50`}
      >
        <ThemeInitScript />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
