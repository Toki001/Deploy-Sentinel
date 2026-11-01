import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "../components/Navigation";

export const metadata: Metadata = {
  title: "DeploySentinel — Incident Platform",
  description: "Deterministic incident correlation and bounded read-only AI investigation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark bg-slate-950">
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
        <Navigation />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
          DeploySentinel &bull; Deterministic Correlation &bull; Bounded Read-Only AI &bull; No
          Autonomous Rollbacks
        </footer>
      </body>
    </html>
  );
}
