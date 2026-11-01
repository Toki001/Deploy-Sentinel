import Link from "next/link";
import { GitCommit, Clock, CheckCircle } from "lucide-react";

interface DeploymentItem {
  id: string;
  service: string;
  version: string;
  environment: string;
  commitSha: string;
  deployedBy: string;
  deployedAt: string;
  status: "active" | "superseded";
}

const mockDeployments: DeploymentItem[] = [
  {
    id: "dep-501",
    service: "checkout-service",
    version: "v2.4.1",
    environment: "production",
    commitSha: "9f8a12c",
    deployedBy: "ci-bot",
    deployedAt: "14:02 UTC today",
    status: "active",
  },
  {
    id: "dep-500",
    service: "auth-gateway",
    version: "v1.12.0",
    environment: "production",
    commitSha: "4b7c881",
    deployedBy: "alice@company.com",
    deployedAt: "11:15 UTC today",
    status: "active",
  },
  {
    id: "dep-499",
    service: "checkout-service",
    version: "v2.4.0",
    environment: "production",
    commitSha: "e83d10a",
    deployedBy: "bob@company.com",
    deployedAt: "2 days ago",
    status: "superseded",
  },
];

export default function DeploymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Deployments</h1>
          <p className="text-slate-400 text-sm mt-1">
            Authenticated deployment records and webhook ingress audit trail.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-3">Service</th>
                <th className="px-6 py-3">Version</th>
                <th className="px-6 py-3">Commit</th>
                <th className="px-6 py-3">Env</th>
                <th className="px-6 py-3">Deployed By</th>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {mockDeployments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-850/50 transition">
                  <td className="px-6 py-4 font-medium text-slate-100">{d.service}</td>
                  <td className="px-6 py-4 font-mono text-xs">{d.version}</td>
                  <td className="px-6 py-4 font-mono text-xs text-blue-400">{d.commitSha}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-xs font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {d.environment}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">{d.deployedBy}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{d.deployedAt}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        d.status === "active"
                          ? "bg-blue-950 text-blue-400 border-blue-800"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
