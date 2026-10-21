import "./globals.css";
import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Know Before You Rip | Evidence-first wax intelligence",
  description:
    "Track high-end card sightings, analyze sealed returns, and model experimental rip outcomes.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <div className="shell nav">
            <Link href="/" className="logo">
              <span className="mark">
                <ChartNoAxesCombined size={21} />
              </span>
              <span>
                KNOW BEFORE{" "}
                <span style={{ color: "var(--accent)" }}>YOU RIP</span>
              </span>
            </Link>
            <nav className="links">
              <Link href="/">Releases</Link>
              <Link href="/chases">Chase tracker</Link>
              <Link href="/evidence">Submit evidence</Link>
              <Link href="/admin">Review</Link>
              <Link href="/about">Methodology</Link>
            </nav>
          </div>
        </header>
        <main className="shell">{children}</main>
        <footer className="footer">
          <div className="shell">
            Know Before You Rip · MVP preview · Research tool, not financial
            advice. Prices and sightings are not live feeds.
          </div>
        </footer>
      </body>
    </html>
  );
}
