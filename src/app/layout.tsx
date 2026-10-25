import type { Metadata } from "next";
import "./globals.css";
import { isTpwSignedIn } from "@/lib/tpwAuth";
import SiteHeader from "./SiteHeader";

export const metadata: Metadata = {
  title: "Spera — TPW program reporting",
  description:
    "Community organizations report their prison programs in a minute; TPW sees programming hours, participants and completions across its network.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tpw = await isTpwSignedIn();
  return (
    <html lang="en">
      <body>
        <SiteHeader tpwSignedIn={tpw} />
        {children}
      </body>
    </html>
  );
}
