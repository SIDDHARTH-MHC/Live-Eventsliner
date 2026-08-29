"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actor: string;
  createdAt: string;
};

export default function AuditLogsPage() {
  const params = useParams<{ orgSlug: string }>();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetch(`/api/v1/orgs/${params.orgSlug}/audit-logs`)
      .then((r) => r.json())
      .then((data) => setLogs(data.logs ?? []));
  }, [params.orgSlug]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href={`/orgs/${params.orgSlug}`} className="text-primary underline">
        ← Organization
      </Link>
      <h1 className="mt-4 text-headline">Audit log</h1>
      <table className="mt-6 w-full text-body">
        <thead>
          <tr className="border-b text-left text-label text-muted-foreground">
            <th className="pb-2">When</th>
            <th className="pb-2">Actor</th>
            <th className="pb-2">Action</th>
            <th className="pb-2">Target</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-border">
              <td className="py-2 text-body-sm">{new Date(l.createdAt).toLocaleString("en-IN")}</td>
              <td className="py-2">{l.actor}</td>
              <td className="py-2 font-mono text-body-sm">{l.action}</td>
              <td className="py-2 text-body-sm">
                {l.targetType}/{l.targetId.slice(0, 8)}…
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
