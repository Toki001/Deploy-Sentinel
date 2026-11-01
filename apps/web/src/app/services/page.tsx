import Link from "next/link";
import { Server, ArrowRight, Activity } from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  tier: string;
  description: string;
  activeDeployments: number;
  status: "healthy" | "degraded" | "failing";
}

const mockServices: ServiceItem[] = [
  {
    id: "svc-checkout",
    name: "checkout-service",
    tier: "tier-1",
    description: "Cart checkout, payment gateway orchestration, and order finalization",
    activeDeployments: 3,
    status: "degraded",
  },
  {
    id: "svc-auth",
    name: "auth-gateway",
    tier: "tier-1",
    description: "Session lifecycle, OAuth token exchange, and edge rate limiting",
    activeDeployments: 1,
    status: "healthy",
  },
  {
    id: "svc-inventory",
    name: "inventory-service",
    tier: "tier-2",
    description: "Warehouse stock levels, SKU reservation, and replenishment alerts",
    activeDeployments: 2,
    status: "healthy",
  },
  {
    id: "svc-indexer",
    name: "search-indexer",
    tier: "tier-2",
    description: "Elasticsearch synchronization and catalog inverted index updater",
    activeDeployments: 1,
    status: "healthy",
  },
];

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Enrolled Services</h1>
          <p className="text-slate-400 text-sm mt-1">
            Service topology, ownership tags, and telemetry ingestion health.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockServices.map((svc) => (
          <div
            key={svc.id}
            className="bg-slate-900 border border-slate-800 rounded-lg p-5 hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-semibold text-slate-200">{svc.name}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    {svc.tier}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{svc.description}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium border ${
                  svc.status === "degraded"
                    ? "bg-amber-950 text-amber-400 border-amber-800"
                    : "bg-emerald-950 text-emerald-400 border-emerald-800"
                }`}
              >
                {svc.status}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center">
                <Activity className="h-3.5 w-3.5 mr-1 text-slate-500" />
                {svc.activeDeployments} recent deploys
              </span>
              <Link
                href={`/services/${svc.id}`}
                className="text-blue-400 hover:text-blue-300 font-medium flex items-center"
              >
                View Service
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
