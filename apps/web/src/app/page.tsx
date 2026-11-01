import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  GitCommit,
  Search,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Operations Control Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Synthetic incident correlation and bounded diagnostic investigation overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/incidents"
              className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-sm"
            >
              View Active Incidents
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Active Incidents
            </span>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">1</span>
            <span className="text-xs text-amber-400 font-medium">1 investigating</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Deduplicated from 8 raw alerts</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Enrolled Services
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">10</span>
            <span className="text-xs text-slate-400 font-medium">synthetic</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Monitored across 3 tiers</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Deployments (24h)
            </span>
            <GitCommit className="h-5 w-5 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">14</span>
            <span className="text-xs text-blue-400 font-medium">HMAC verified</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">1 release correlation trigger</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              AI Investigations
            </span>
            <Search className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">6</span>
            <span className="text-xs text-indigo-400 font-medium">bounded read-only</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">100% cited evidence verified</p>
        </div>
      </div>

      {/* Active Incident Snapshot */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <h2 className="text-base font-semibold text-slate-100">Recent Incident Trigger</h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-950 text-red-400 border border-red-800/60">
            CRITICAL
          </span>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                <span className="font-mono text-slate-300">INC-1049</span>
                <span>&bull;</span>
                <span>service: checkout-service</span>
                <span>&bull;</span>
                <span>env: production</span>
              </div>
              <h3 className="text-lg font-medium text-slate-100">
                Checkout API 504 Gateway Timeout spike following v2.4.1 release
              </h3>
              <p className="text-sm text-slate-400 mt-1 max-w-3xl">
                Error rate exceeded 24.5% (threshold 2.0%). Outbox pipeline correlated 4 alert
                webhooks with deployment artifact <code>sha:9f8a12</code>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/incidents/INC-1049"
                className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition"
              >
                Inspect Incident
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* System Integrity & Non-Goals Warning */}
      <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start space-x-3">
        <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
        <div>
          <strong className="text-slate-300">Guardrail enforcement active:</strong> AI
          investigations run within a read-only sandbox capped at 4 tool calls and 2 reasoning
          rounds. No autonomous rollback, code execution, or infrastructure mutations are permitted.
        </div>
      </div>
    </div>
  );
}
