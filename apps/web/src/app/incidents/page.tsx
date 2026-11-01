import Link from "next/link";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";

interface IncidentItem {
  id: string;
  title: string;
  service: string;
  status: "open" | "acknowledged" | "investigating" | "mitigated" | "resolved";
  severity: "critical" | "high" | "medium" | "low";
  openedAt: string;
}

const mockIncidents: IncidentItem[] = [
  {
    id: "INC-1049",
    title: "Checkout API 504 Gateway Timeout spike following v2.4.1 release",
    service: "checkout-service",
    status: "investigating",
    severity: "critical",
    openedAt: "12 minutes ago",
  },
  {
    id: "INC-1048",
    title: "Auth Gateway JWT validation failure rate elevated",
    service: "auth-gateway",
    status: "acknowledged",
    severity: "high",
    openedAt: "1 hour ago",
  },
  {
    id: "INC-1047",
    title: "Search indexer replication lag exceeding 45 seconds",
    service: "search-indexer",
    status: "resolved",
    severity: "medium",
    openedAt: "4 hours ago",
  },
];

export default function IncidentsPage() {
  const getSeverityBadge = (severity: IncidentItem["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-red-950 text-red-400 border-red-800/60";
      case "high":
        return "bg-amber-950 text-amber-400 border-amber-800/60";
      case "medium":
        return "bg-blue-950 text-blue-400 border-blue-800/60";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getStatusBadge = (status: IncidentItem["status"]) => {
    switch (status) {
      case "investigating":
        return "bg-indigo-950 text-indigo-300 border-indigo-800/50";
      case "open":
        return "bg-rose-950 text-rose-300 border-rose-800/50";
      case "acknowledged":
        return "bg-amber-950 text-amber-300 border-amber-800/50";
      case "resolved":
        return "bg-emerald-950 text-emerald-300 border-emerald-800/50";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Incident Registry</h1>
          <p className="text-slate-400 text-sm mt-1">
            Deterministic event correlation timelines and state machine transitions.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-slate-200">{mockIncidents.length}</strong> incidents
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Order:</span>
            <span className="text-xs font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              occurredAt DESC
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {mockIncidents.map((incident) => (
            <div
              key={incident.id}
              className="p-5 hover:bg-slate-850/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-semibold text-slate-300">
                    {incident.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${getSeverityBadge(incident.severity)}`}
                  >
                    {incident.severity}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border uppercase tracking-wider ${getStatusBadge(incident.status)}`}
                  >
                    {incident.status}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-slate-100">
                  <Link
                    href={`/incidents/${incident.id}`}
                    className="hover:text-blue-400 transition"
                  >
                    {incident.title}
                  </Link>
                </h2>
                <div className="flex items-center space-x-4 text-xs text-slate-400">
                  <span>
                    Service: <strong className="text-slate-300">{incident.service}</strong>
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1 text-slate-500" />
                    {incident.openedAt}
                  </span>
                </div>
              </div>

              <div className="flex items-center">
                <Link
                  href={`/incidents/${incident.id}`}
                  className="inline-flex items-center text-xs font-medium text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition"
                >
                  Details
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
