import type { Metadata } from "next";
import { Geist, Geist_Mono, Delius } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const delius = Delius({
  variable: "--font-delius",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "FloatDate — Find Your Person",
  description:
    "Answer 74 research-backed compatibility questions. Get matched with one person each week. Exclusive to Wilfrid Laurier University.",
  robots: "noindex",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${delius.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
