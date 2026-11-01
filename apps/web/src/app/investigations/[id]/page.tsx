import Link from "next/link";
import { ArrowLeft, Bot, ShieldCheck, CheckCircle2, AlertTriangle, FileCode } from "lucide-react";

export default function InvestigationDetailPage({ params }: { params: { id: string } }) {
  const invId = params.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-sm text-slate-400">
        <Link href="/investigations" className="hover:text-slate-200 flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Investigations
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-200">{invId}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950 px-2.5 py-1 rounded border border-indigo-800">
                {invId}
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                COMPLETED
              </span>
              <span className="text-xs text-slate-400">
                Incident:{" "}
                <Link
                  href="/incidents/INC-1049"
                  className="font-mono text-blue-400 hover:underline"
                >
                  INC-1049
                </Link>
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100">
              Investigation Outcome &bull; checkout-service
            </h1>
            <p className="text-sm text-slate-400">
              Diagnostic loop executed 3 tool calls across 1 model reasoning round within strict
              read-only boundary.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Hypotheses */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Ranked Root-Cause Hypotheses
            </h2>

            <div className="p-4 rounded border border-blue-900/60 bg-blue-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Rank 1 &bull; release_regression
                </span>
                <span className="text-xs text-slate-400 font-mono">confidence: high</span>
              </div>
              <p className="text-sm text-slate-200">
                Checkout API 504 Gateway Timeout spike closely follows deployment of v2.4.1 (commit{" "}
                <code>9f8a12c</code>). Telemetry window shows upstream connection pool saturation
                immediately after rollout.
              </p>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Cited Evidence IDs:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="font-mono text-xs bg-slate-950 px-2 py-0.5 rounded text-indigo-300 border border-slate-800">
                    ev-deploy-9f8a12c
                  </span>
                  <span className="font-mono text-xs bg-slate-950 px-2 py-0.5 rounded text-indigo-300 border border-slate-800">
                    ev-err-spike-1404
                  </span>
                  <span className="font-mono text-xs bg-slate-950 px-2 py-0.5 rounded text-indigo-300 border border-slate-800">
                    ev-alert-504-high
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Proposed Human Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Proposed Human Actions (Non-Autonomous)
            </h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  Review commit diff for <code>9f8a12c</code> (specifically database pool sizing
                  adjustments).
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Verify upstream database read replica connection limits.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Prepare deployment rollback to v2.4.0 if error rate does not abate.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Guardrail and execution audit */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Execution Audit
            </h3>
            <div className="text-xs space-y-2 text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Provider</span>
                <span className="font-mono">deterministic-offline</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Tool Calls</span>
                <span>3 of max 4</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Reasoning Rounds</span>
                <span>1 of max 2</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Mutations Attempted</span>
                <span className="text-emerald-400 font-semibold">0 (enforced read-only)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Elapsed</span>
                <span className="font-mono">142ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Token Cost</span>
                <span className="font-mono">$0.00 (offline)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
