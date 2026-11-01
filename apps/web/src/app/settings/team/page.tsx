import Link from "next/link";
import { Users, Shield, ShieldCheck } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "org_admin" | "on_call" | "viewer";
}

const mockMembers: TeamMember[] = [
  {
    id: "usr-1",
    name: "Alex Rivera",
    email: "alex@company.internal",
    role: "org_admin",
  },
  {
    id: "usr-2",
    name: "Morgan Chen",
    email: "morgan@company.internal",
    role: "on_call",
  },
  {
    id: "usr-3",
    name: "Taylor Reed",
    email: "taylor@company.internal",
    role: "viewer",
  },
];

export default function TeamSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Team & Roles</h1>
          <p className="text-slate-400 text-sm mt-1">
            Role-based access control (RBAC) across organization boundaries.
          </p>
        </div>
        <div className="flex space-x-2">
          <Link
            href="/settings/integrations"
            className="px-3 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Integrations
          </Link>
          <Link
            href="/settings/team"
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 text-blue-400 border border-slate-700"
          >
            Team & Roles
          </Link>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-6 py-3">Member</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Permissions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {mockMembers.map((m) => (
              <tr key={m.id} className="hover:bg-slate-850/50 transition">
                <td className="px-6 py-4 font-medium text-slate-100">{m.name}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-400">{m.email}</td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                    {m.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-400">
                  {m.role === "org_admin" &&
                    "Full administrative control, secret rotation, service enrollment"}
                  {m.role === "on_call" &&
                    "Acknowledge/resolve incidents, trigger investigations, DLQ replay"}
                  {m.role === "viewer" && "Read-only access to incident and service telemetry"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
