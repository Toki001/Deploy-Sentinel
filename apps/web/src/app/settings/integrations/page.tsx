import Link from "next/link";
import { Key, ShieldCheck, CheckCircle2, Lock } from "lucide-react";

export default function IntegrationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Integration Settings</h1>
          <p className="text-slate-400 text-sm mt-1">
            Webhook ingress endpoints, HMAC verification secrets, and API credentials.
          </p>
        </div>
        <div className="flex space-x-2">
          <Link
            href="/settings/integrations"
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-800 text-blue-400 border border-slate-700"
          >
            Integrations
          </Link>
          <Link
            href="/settings/team"
            className="px-3 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Team & Roles
          </Link>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Webhook Ingress Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            All webhook requests require raw SHA-256 HMAC signatures via <code>x-signature</code>{" "}
            and <code>x-timestamp</code> headers.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded border border-slate-800 bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">Deployment Webhook Ingress</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ACTIVE
              </span>
            </div>
            <div className="font-mono text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
              POST http://localhost:4000/v1/webhooks/deployments
            </div>
          </div>

          <div className="p-4 rounded border border-slate-800 bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">Alert Notification Webhook</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ACTIVE
              </span>
            </div>
            <div className="font-mono text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
              POST http://localhost:4000/v1/webhooks/alerts
            </div>
          </div>

          <div className="p-4 rounded border border-slate-800 bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">
                Signing Secret (Dev Default)
              </span>
              <span className="text-xs text-slate-500">Constant-time verified</span>
            </div>
            <div className="font-mono text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
              <span>dev_webhook_signing_secret_32bytes!</span>
              <Lock className="h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
