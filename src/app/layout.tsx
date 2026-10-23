import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImpactLink — TPW Impact Framework",
  description:
    "Joins community-program process data with recidivism outcomes, using CDCR's official metrics, to produce funder-ready impact evidence for TPW.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
