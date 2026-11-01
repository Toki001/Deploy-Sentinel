import Link from "next/link";
import { ArrowLeft, Server, Activity, GitCommit, AlertTriangle } from "lucide-react";

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const serviceId = params.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-sm text-slate-400">
        <Link href="/services" className="hover:text-slate-200 flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Services
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-200">{serviceId}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-slate-100">{serviceId}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                tier-1
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Core production service telemetry and correlation rules.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Service Health
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Current Status</span>
              <span className="text-amber-400 font-medium">Degraded (INC-1049)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">Active Error Rate</span>
              <span className="font-mono text-red-400">24.5%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-500">P95 Latency</span>
              <span className="font-mono text-slate-300">1,840ms</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Recent Deployments
          </h2>
          <div className="divide-y divide-slate-800 text-sm">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">v2.4.1</span>
                <span className="ml-2 font-mono text-xs text-slate-400">commit: 9f8a12c</span>
              </div>
              <span className="text-xs text-slate-400">12 min ago (production)</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">v2.4.0</span>
                <span className="ml-2 font-mono text-xs text-slate-400">commit: e83d10a</span>
              </div>
              <span className="text-xs text-slate-400">2 days ago (production)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
