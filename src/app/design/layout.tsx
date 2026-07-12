import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "FloatDate Style Guide",
  robots: { index: false },
};

export default function DesignLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return children;
}
