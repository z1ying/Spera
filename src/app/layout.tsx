import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { isTpwSignedIn } from "@/lib/tpwAuth";

export const metadata: Metadata = {
  title: "ImpactLink — TPW program reporting",
  description:
    "Community organizations report their prison programs in a minute; TPW sees programming hours, participants and completions across its network.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tpw = await isTpwSignedIn();
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white print:hidden">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-sm">
            <Link href="/" className="font-semibold text-emerald-900">
              ImpactLink
            </Link>
            {tpw ? (
              <>
                <Link href="/tpw" className="text-slate-700 hover:text-slate-900">
                  Dashboard
                </Link>
                <Link href="/" className="text-slate-700 hover:text-slate-900">
                  Organization form
                </Link>
                <form action="/api/tpw/logout" method="post" className="ml-auto flex items-center gap-3">
                  <span className="text-xs text-slate-500">Signed in as TPW staff</span>
                  <button className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50">Sign out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/" className="text-slate-700 hover:text-slate-900">
                  Report a program
                </Link>
                <Link href="/data-use" className="text-slate-700 hover:text-slate-900">
                  How data is used
                </Link>
                <Link href="/tpw" className="ml-auto rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50">
                  TPW staff sign in
                </Link>
              </>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
