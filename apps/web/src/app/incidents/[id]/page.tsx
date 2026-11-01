import Link from "next/link";
import { ArrowLeft, CheckCircle, ShieldAlert, Clock, GitCommit, FileText, Bot } from "lucide-react";

export default function IncidentDetailPage({ params }: { params: { id: string } }) {
  const incidentId = params.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-sm text-slate-400">
        <Link href="/incidents" className="hover:text-slate-200 flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Incidents
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-200">{incidentId}</span>
      </div>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                {incidentId}
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-red-950 text-red-400 border border-red-800">
                CRITICAL
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                INVESTIGATING
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100">
              Checkout API 504 Gateway Timeout spike following v2.4.1 release
            </h1>
            <p className="text-sm text-slate-400">
              Correlated within 5-minute sliding window across deployment events and error metric
              webhooks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled
              title="State machine actions transition via authenticated API"
              className="px-3.5 py-2 rounded bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700 cursor-not-allowed opacity-80"
            >
              Acknowledge
            </button>
            <Link
              href={`/investigations/INV-2041`}
              className="inline-flex items-center px-3.5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition"
            >
              <Bot className="h-4 w-4 mr-1.5" />
              View Investigation Run
            </Link>
          </div>
        </div>
      </div>

      {/* Correlated Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Correlated Event Timeline
            </h2>
            <div className="space-y-4">
              <div className="border-l-2 border-blue-500 pl-4 py-1">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  <span>14:02:11 UTC &bull; DeploymentCreated</span>
                </div>
                <div className="text-sm font-medium text-slate-200 mt-0.5">
                  checkout-service v2.4.1 deployed to production (commit: <code>9f8a12c</code>)
                </div>
              </div>

              <div className="border-l-2 border-red-500 pl-4 py-1">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-red-400" />
                  <span>14:04:30 UTC &bull; ErrorRateChanged</span>
                </div>
                <div className="text-sm font-medium text-slate-200 mt-0.5">
                  Error rate surged from 0.04% to 24.5% (threshold: 2.0%)
                </div>
              </div>

              <div className="border-l-2 border-amber-500 pl-4 py-1">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>14:05:00 UTC &bull; AlertTriggered</span>
                </div>
                <div className="text-sm font-medium text-slate-200 mt-0.5">
                  HighErrorRate alert triggered on checkout-service
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Metadata
            </h3>
            <div className="text-xs space-y-2 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Service</span>
                <span className="font-mono">checkout-service</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Environment</span>
                <span>production</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Correlation Key</span>
                <span className="font-mono">corr-checkout-deploy-24</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Outbox Status</span>
                <span className="text-emerald-400">published</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
