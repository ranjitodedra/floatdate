import type { Metadata } from "next";
import { Geist, Geist_Mono, Delius, Libre_Baskerville } from "next/font/google";
import { Suspense } from "react";
import ReferralCapture from "@/components/ReferralCapture";
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

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["700"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "FloatDate | Find Your Person",
  description:
    "Answer 74 research-backed compatibility questions. Get matched with one person each week. Exclusive to Wilfrid Laurier University.",
  metadataBase: new URL("https://www.floatdate.com"),
  openGraph: {
    title: "FloatDate | Find Your Person",
    description:
      "Answer 74 research-backed compatibility questions. Get matched with one person each week. Exclusive to Wilfrid Laurier University.",
    url: "https://www.floatdate.com",
    siteName: "FloatDate",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${delius.variable} ${libreBaskerville.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
