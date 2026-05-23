import type { Metadata } from "next";
import { Inter } from "next/font/google";
import CookieNotice from "@/components/cookie-notice";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Daysight — Never Forget the Days That Matter",
    template: "%s — Daysight",
  },
  description:
    "Daysight sends you a heads-up before the birthdays and anniversaries you don't want to miss, with gift ideas ready to go. Free, always.",
  metadataBase: new URL("https://daysight.xyz"),
  keywords: [
    "birthday reminder",
    "gift reminder",
    "anniversary reminder",
    "birthday gift ideas",
    "never forget birthdays",
    "gift suggestions",
    "Daysight",
  ],
  authors: [{ name: "Daysight" }],
  creator: "Daysight",
  openGraph: {
    title: "Daysight — Never Forget the Days That Matter",
    description:
      "Get timely reminders with curated gift suggestions before birthdays and anniversaries. Free, always.",
    siteName: "Daysight",
    type: "website",
    url: "https://daysight.xyz",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Daysight — Never Forget the Days That Matter",
    description:
      "Get timely reminders with curated gift suggestions before birthdays and anniversaries. Free, always.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://daysight.xyz",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-daysight.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  other: {
    "theme-color": "#d05a32",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased text-gray-900 bg-white">
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
