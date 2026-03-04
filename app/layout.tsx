import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Compliance Risicocalculator | EU AI Act",
  description: "Beoordeel in vijf stappen de compliance-status van uw AI-systeem ten opzichte van de EU AI-verordening (Bijlage III & Artikel 12).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950`}
        style={{ colorScheme: "dark" }}
      >
        {children}
      </body>
    </html>
  );
}
