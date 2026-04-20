import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daysight — Never miss a birthday again",
  description:
    "Email-first birthday and gift reminder service for busy professionals. Get timely reminders with curated gift suggestions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-gray-900 bg-white">
        {children}
      </body>
    </html>
  );
}
