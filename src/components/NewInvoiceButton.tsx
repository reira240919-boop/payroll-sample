"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

function currentPeriodLabel() {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月分`;
}

export default function NewInvoiceButton({
  contractorId,
  latestInvoiceId,
}: {
  contractorId: string;
  latestInvoiceId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create(copyFromInvoiceId: string | null) {
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractorId,
        issueDate: new Date().toISOString(),
        periodLabel: currentPeriodLabel(),
        copyFromInvoiceId,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.push(`/admin/invoices/${contractorId}/${data.id}/edit`);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => create(null)}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading && <Spinner />}
          + 白紙で新規作成
        </button>
        {latestInvoiceId && (
          <button
            onClick={() => create(latestInvoiceId)}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {loading && <Spinner />}
            + 前回の項目をコピーして作成
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-slate-400">
        押すたびに新しい請求書が作成されます。同じ内容を二重に作らないよう、連続クリックにご注意ください。
      </p>
    </div>
  );
}
