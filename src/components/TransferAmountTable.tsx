"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/payroll-utils";

interface Row {
  payslipId: string;
  name: string;
  amount: number;
  transferConfirmed: boolean;
}

export default function TransferAmountTable({
  rows,
  label,
  notice,
}: {
  rows: Row[];
  label: string;
  // 指定すると、チェック後に「全員チェック済みなら社長に振込完了メール」を送る
  notice?: { periodId: string; payday: string };
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>(
    Object.fromEntries(rows.map((r) => [r.payslipId, r.transferConfirmed]))
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const subtotal = rows.reduce((s, r) => s + r.amount, 0);

  async function toggle(payslipId: string, next: boolean) {
    setConfirmed((prev) => ({ ...prev, [payslipId]: next }));
    setSaving((prev) => ({ ...prev, [payslipId]: true }));
    await fetch(`/api/payslips/${payslipId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transferConfirmed: next }),
    });
    if (notice && next) {
      // 送れたかどうかは、再読み込み後の TransferNoticeStatus に表示される
      await fetch("/api/payroll/transfer-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notice),
      }).catch(() => {});
    }
    setSaving((prev) => ({ ...prev, [payslipId]: false }));
    router.refresh();
  }

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}（{rows.length}名）
      </p>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-slate-500 shadow-sm">対象者なし</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="w-10 px-4 py-2 text-left"></th>
                <th className="px-4 py-2 text-left">氏名</th>
                <th className="px-4 py-2 text-right">差引支給額</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.payslipId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={confirmed[r.payslipId] ?? false}
                      disabled={saving[r.payslipId] || confirmed[r.payslipId]}
                      onChange={(e) => toggle(r.payslipId, e.target.checked)}
                      title={confirmed[r.payslipId] ? "一度確定するとチェックは外せません" : undefined}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <span>{r.name}</span>
                    {confirmed[r.payslipId] && (
                      <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">
                        {label}済み
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 font-bold">
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2">小計</td>
                <td className="px-4 py-2 text-right tabular-nums text-blue-700">
                  {formatCurrency(subtotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
