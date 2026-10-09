"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/payroll";
import Spinner from "@/components/Spinner";

interface Repayment {
  id: string;
  amount: number;
  repaidAt: string | Date;
  memo: string | null;
  payslipId: string | null;
}

interface Advance {
  id: string;
  employee: { id: string; name: string };
  loanDate: string | Date;
  loanAmount: number;
  balance: number;
  memo: string | null;
  repayments: Repayment[];
}

function toDateInputValue(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

function AdvanceCard({ advance }: { advance: Advance }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    loanDate: toDateInputValue(advance.loanDate),
    loanAmount: String(advance.loanAmount),
    memo: advance.memo || "",
  });

  const [repaying, setRepaying] = useState(false);
  const [repaySaving, setRepaySaving] = useState(false);
  const [repayError, setRepayError] = useState("");
  const [deletingRepaymentId, setDeletingRepaymentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [repayForm, setRepayForm] = useState({
    amount: "",
    repaidAt: toDateInputValue(new Date()),
    memo: "",
  });

  async function handleRepay() {
    setRepaySaving(true);
    setRepayError("");
    const res = await fetch(`/api/salary-advances/${advance.id}/repayments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(repayForm.amount) || 0,
        repaidAt: repayForm.repaidAt,
        memo: repayForm.memo,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setRepaySaving(false);
    if (!res.ok) {
      setRepayError(data.error || "記録に失敗しました");
      return;
    }
    setRepaying(false);
    setRepayForm({ amount: "", repaidAt: toDateInputValue(new Date()), memo: "" });
    router.refresh();
  }

  async function handleDeleteRepayment(repaymentId: string) {
    if (!confirm("この返済記録を取り消しますか？残高は元に戻ります。")) return;
    setDeletingRepaymentId(repaymentId);
    const res = await fetch(`/api/salary-advances/${advance.id}/repayments/${repaymentId}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setDeletingRepaymentId(null);
    if (!res.ok) {
      alert(data.error || "取消に失敗しました");
      return;
    }
    router.refresh();
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/salary-advances/${advance.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loanDate: form.loanDate,
        loanAmount: parseFloat(form.loanAmount) || 0,
        memo: form.memo,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "保存に失敗しました");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("この前払い記録を削除しますか？")) return;
    setDeleting(true);
    const res = await fetch(`/api/salary-advances/${advance.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      alert(data.error || "削除に失敗しました");
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-slate-200 p-3">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <label className="text-xs text-slate-500">貸付日</label>
            <input
              type="date"
              value={form.loanDate}
              onChange={(e) => setForm({ ...form, loanDate: e.target.value })}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">貸付額（円）</label>
            <input
              type="number"
              value={form.loanAmount}
              onChange={(e) => setForm({ ...form, loanAmount: e.target.value })}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">メモ</label>
            <input
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">貸付日: {formatDate(advance.loanDate)}</p>
          <p className="text-sm text-slate-600">貸付額: {formatCurrency(advance.loanAmount)}</p>
          {advance.memo && <p className="text-sm text-slate-500">{advance.memo}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-orange-700">残高 {formatCurrency(advance.balance)}</p>
          <div className="mt-1 flex justify-end gap-2">
            {advance.balance > 0 && (
              <button
                onClick={() => setRepaying(true)}
                className="text-xs text-green-700 hover:underline"
              >
                返済を記録
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              修正
            </button>
            {advance.repayments.length === 0 && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                {deleting && <Spinner />}
                削除
              </button>
            )}
          </div>
        </div>
      </div>

      {repaying && (
        <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3">
          {repayError && <p className="mb-2 text-xs text-red-600">{repayError}</p>}
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="text-xs text-slate-500">返済日</label>
              <input
                type="date"
                value={repayForm.repaidAt}
                onChange={(e) => setRepayForm({ ...repayForm, repaidAt: e.target.value })}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">返済額（円）</label>
              <input
                type="number"
                value={repayForm.amount}
                onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })}
                placeholder={`最大 ${advance.balance}`}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">メモ（任意）</label>
              <input
                value={repayForm.memo}
                onChange={(e) => setRepayForm({ ...repayForm, memo: e.target.value })}
                placeholder="例：現金で返済"
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleRepay}
              disabled={repaySaving}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {repaySaving ? "記録中..." : "記録する"}
            </button>
            <button
              onClick={() => setRepaying(false)}
              className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {advance.repayments.length > 0 && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <p className="mb-1 text-xs font-medium text-slate-500">返済履歴</p>
          {advance.repayments.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-600">
                {formatDate(r.repaidAt)}: {formatCurrency(r.amount)}
                {r.memo && ` (${r.memo})`}
                {!r.payslipId && <span className="ml-1 text-slate-400">（手入力）</span>}
              </p>
              {!r.payslipId && (
                <button
                  onClick={() => handleDeleteRepayment(r.id)}
                  disabled={deletingRepaymentId === r.id}
                  className="flex shrink-0 items-center gap-1 text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  {deletingRepaymentId === r.id && <Spinner />}
                  取消
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SalaryAdvanceLedger({ advances }: { advances: Advance[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { employee: { id: string; name: string }; totalBalance: number; advances: Advance[] }
    >();

    for (const advance of advances) {
      const key = advance.employee.id;
      if (!map.has(key)) {
        map.set(key, { employee: advance.employee, totalBalance: 0, advances: [] });
      }
      const group = map.get(key)!;
      group.totalBalance += advance.balance;
      group.advances.push(advance);
    }

    return Array.from(map.values()).sort((a, b) => b.totalBalance - a.totalBalance);
  }, [advances]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (groups.length === 0) {
    return <p className="mt-6 text-slate-600">前払い記録がありません</p>;
  }

  return (
    <div className="mt-6 space-y-3">
      {groups.map((group) => {
        const isOpen = openIds.has(group.employee.id);
        return (
          <div
            key={group.employee.id}
            className="overflow-hidden rounded-xl bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggle(group.employee.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block text-slate-400 transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                >
                  ▶
                </span>
                <span className="font-semibold text-slate-900">{group.employee.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {group.advances.length}件
                </span>
              </div>
              <p
                className={`text-lg font-bold ${
                  group.totalBalance > 0 ? "text-orange-700" : "text-slate-400"
                }`}
              >
                残高 {formatCurrency(group.totalBalance)}
              </p>
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-slate-100 px-4 py-3">
                {group.advances.map((advance) => (
                  <AdvanceCard key={advance.id} advance={advance} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
