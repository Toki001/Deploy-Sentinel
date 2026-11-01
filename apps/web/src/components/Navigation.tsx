"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Layers,
  Server,
  GitCommit,
  Search,
  Settings,
  ShieldCheck,
  Activity,
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Overview", icon: Layers },
    { href: "/incidents", label: "Incidents", icon: AlertTriangle },
    { href: "/services", label: "Services", icon: Server },
    { href: "/deployments", label: "Deployments", icon: GitCommit },
    { href: "/investigations", label: "Investigations", icon: Search },
    { href: "/settings/integrations", label: "Settings", icon: Settings },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm">
                DS
              </div>
              <span className="font-semibold text-lg text-slate-100 tracking-tight">
                DeploySentinel
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50">
                demo mode
              </span>
            </Link>

            <nav className="hidden md:flex space-x-1" aria-label="Main Navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-800 text-blue-400 border border-slate-700/60"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center text-xs text-slate-400 border border-slate-800 rounded px-2.5 py-1 bg-slate-950">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 mr-1.5" />
              <span>
                Role: <strong className="text-slate-200 font-medium">org_admin</strong>
              </span>
            </div>
            <div className="flex items-center text-xs text-slate-400 border border-slate-800 rounded px-2.5 py-1 bg-slate-950">
              <Activity className="h-3.5 w-3.5 text-blue-400 mr-1.5" />
              <span>
                API: <strong className="text-slate-200 font-medium">:4000</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
