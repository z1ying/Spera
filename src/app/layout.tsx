import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { isTpwSignedIn } from "@/lib/tpwAuth";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export const metadata: Metadata = {
  title: "Spera — TPW program reporting",
  description:
    "Community organizations report their prison programs in a minute; TPW sees programming hours, participants and completions across its network.",
};

const serif = Source_Serif_4({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-source-serif" });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tpw = await isTpwSignedIn();
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <SiteHeader tpwSignedIn={tpw} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
