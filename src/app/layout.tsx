import type { Metadata, Viewport } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

// Nunito — rounded, friendly geometric sans matching the flat-design reference
const nunito = Nunito({
  variable: "--font-app-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BAYWASH Group — Manager Dashboard",
  description:
    "BAYWASH Group manager workspace: employees, hours, leave, complaints, loans, fleet tracking, factory reports, weekly reports and Smartsheet-style sheets.",
  keywords: [
    "BAYWASH",
    "WorkHub",
    "employee management",
    "HR",
    "fleet tracking",
    "timesheet",
    "leave management",
    "loan management",
    "complaints",
    "factory reports",
    "weekly reports",
    "smartsheet",
  ],
  authors: [{ name: "BAYWASH Group" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BAYWASH Group",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "BAYWASH Group — Manager Dashboard",
    description: "Unified manager workspace for employees, fleet, and operations.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#01205E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${nunito.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <Sonner />
        </ThemeProvider>
      </body>
    </html>
  );
}
