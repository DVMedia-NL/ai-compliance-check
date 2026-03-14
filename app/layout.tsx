import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Compliance Risicocalculator | EU AI Act",
  description: "Beoordeel in 9 stappen de compliance-status van uw AI-systeem ten opzichte van de EU AI-verordening.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-background text-foreground`}
        style={{ colorScheme: "dark" }}
      >
        {children}
      </body>
    </html>
  );
}
