import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
      </body>
    </html>
  );
}
