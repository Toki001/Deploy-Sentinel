import Link from "next/link";
import { Bot, ArrowRight, ShieldCheck, Clock } from "lucide-react";

interface InvestigationItem {
  id: string;
  incidentId: string;
  service: string;
  model: string;
  toolCalls: number;
  topHypothesis: string;
  uncertainty: string;
  createdAt: string;
  status: "completed" | "running" | "failed";
}

const mockInvestigations: InvestigationItem[] = [
  {
    id: "INV-2041",
    incidentId: "INC-1049",
    service: "checkout-service",
    model: "offline-deterministic-v1",
    toolCalls: 3,
    topHypothesis: "Release regression: timeout spike closely follows v2.4.1 artifact deployment",
    uncertainty: "Moderate",
    createdAt: "8 minutes ago",
    status: "completed",
  },
  {
    id: "INV-2040",
    incidentId: "INC-1048",
    service: "auth-gateway",
    model: "offline-deterministic-v1",
    toolCalls: 2,
    topHypothesis: "Bad configuration: secret key rotation mismatch",
    uncertainty: "Low",
    createdAt: "1 hour ago",
    status: "completed",
  },
];

export default function InvestigationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">AI Investigations</h1>
          <p className="text-slate-400 text-sm mt-1">
            Bounded read-only diagnostic runs with verified evidence ID citations.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="divide-y divide-slate-800">
          {mockInvestigations.map((inv) => (
            <div
              key={inv.id}
              className="p-5 hover:bg-slate-850/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                    {inv.id}
                  </span>
                  <span className="text-xs text-slate-400">Incident:</span>
                  <Link
                    href={`/incidents/${inv.incidentId}`}
                    className="font-mono text-xs text-blue-400 hover:underline"
                  >
                    {inv.incidentId}
                  </Link>
                  <span className="px-2 py-0.5 rounded text-xs font-medium border bg-emerald-950 text-emerald-400 border-emerald-800">
                    {inv.status}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-slate-200">{inv.topHypothesis}</h2>
                <div className="flex items-center space-x-4 text-xs text-slate-400">
                  <span>
                    Model: <strong className="text-slate-300 font-mono">{inv.model}</strong>
                  </span>
                  <span>
                    Tools called: <strong className="text-slate-300">{inv.toolCalls}/4</strong>
                  </span>
                  <span>
                    Uncertainty: <strong className="text-slate-300">{inv.uncertainty}</strong>
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1 text-slate-500" />
                    {inv.createdAt}
                  </span>
                </div>
              </div>

              <div>
                <Link
                  href={`/investigations/${inv.id}`}
                  className="inline-flex items-center text-xs font-medium text-slate-200 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                >
                  Inspect Evidence
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
