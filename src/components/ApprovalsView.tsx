"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/payroll-utils";
import { monthKey, monthLabel } from "@/lib/date-utils";
import SendToAccountantButton from "@/components/SendToAccountantButton";
import SendForReviewButton from "@/components/SendForReviewButton";
import Spinner from "@/components/Spinner";

interface EmployeeOption {
  id: string;
  name: string;
}

// Building the range via `new Date(y, m, d).toISOString()` shifts the date
// back a day in any timezone ahead of UTC (e.g. JST) — the Date is
// constructed in local time but toISOString() converts to UTC. Format the
// strings directly instead of round-tripping through a Date + UTC string.
function monthRange(monthKeyStr: string) {
  const [year, monthNum] = monthKeyStr.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, monthNum, 0).getDate();
  return {
    startDate: `${year}-${pad(monthNum)}-01`,
    endDate: `${year}-${pad(monthNum)}-${pad(lastDay)}`,
  };
}

interface PayslipItem {
  id: string;
  employeeId: string;
  employeeName: string;
  periodId: string;
  periodStart: string;
  periodLabel: string;
  netPay: number;
  reviewRequestedAt: string | null;
}

function fillReviewMailTemplate(
  template: string,
  vars: { 会社名: string; 期間: string; 人数: number }
) {
  return template
    .replaceAll("{会社名}", vars.会社名)
    .replaceAll("{期間}", vars.期間)
    .replaceAll("{人数}", String(vars.人数));
}

function formatSentDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ApprovalsView({
  pending,
  approved,
  companyName,
  taxAccountantEmail,
  presidentEmail,
  reviewMailTemplate,
}: {
  pending: PayslipItem[];
  approved: PayslipItem[];
  companyName: string;
  taxAccountantEmail: string;
  presidentEmail: string;
  reviewMailTemplate: { subject: string; body: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMonth = monthKey(new Date());

  const availableMonths = useMemo(() => {
    const keys = new Set([
      ...pending.map((p) => monthKey(p.periodStart)),
      ...approved.map((p) => monthKey(p.periodStart)),
      currentMonth,
    ]);
    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1));
  }, [pending, approved, currentMonth]);

  const selectedMonth = searchParams.get("month") || currentMonth;

  function setSelectedMonth(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [individualEmployeeId, setIndividualEmployeeId] = useState("");
  const [creatingIndividual, setCreatingIndividual] = useState(false);

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string; name: string; active: boolean }[]) => {
        setEmployees(data.filter((e) => e.active).map((e) => ({ id: e.id, name: e.name })));
      });
  }, []);

  const monthPending = pending.filter((p) => monthKey(p.periodStart) === selectedMonth);
  const monthApproved = approved.filter((p) => monthKey(p.periodStart) === selectedMonth);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === monthPending.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(monthPending.map((p) => p.id)));
    }
  }

  async function handleApprove() {
    if (selected.size === 0) {
      alert("承認する明細を選択してください");
      return;
    }
    if (!confirm(`${selected.size}件の明細を承認しますか？`)) return;

    setLoading(true);
    await fetch("/api/payslips/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payslipIds: Array.from(selected) }),
    });
    setLoading(false);
    setSelected(new Set());
    router.refresh();
  }

  async function handleGenerate() {
    if (
      !confirm(`${monthLabel(selectedMonth)}の明細を日報から生成（既存の自動行は再計算）しますか？`)
    )
      return;

    setGenerating(true);
    const { startDate, endDate } = monthRange(selectedMonth);

    const periodRes = await fetch("/api/payroll-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    });
    const period = await periodRes.json();
    await fetch(`/api/payroll-periods/${period.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setGenerating(false);
    router.refresh();
  }

  async function handleCreateIndividual(copyFromPrevious: boolean) {
    if (!individualEmployeeId) {
      alert("対象者を選択してください");
      return;
    }
    setCreatingIndividual(true);
    const { startDate, endDate } = monthRange(selectedMonth);

    const res = await fetch("/api/payslips/individual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: individualEmployeeId, startDate, endDate, copyFromPrevious }),
    });
    const data = await res.json().catch(() => ({}));
    setCreatingIndividual(false);
    if (!res.ok) {
      alert(data.error || "作成に失敗しました");
      return;
    }
    router.push(`/admin/payroll/${data.periodId}/${individualEmployeeId}`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label htmlFor="month-filter" className="text-sm text-slate-600">
          表示月
        </label>
        <select
          id="month-filter"
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setSelected(new Set());
          }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {availableMonths.map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
              {key === currentMonth ? "（今月）" : ""}
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {generating ? "生成中..." : "この月の明細を生成"}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm">
        <label htmlFor="individual-employee" className="text-sm text-slate-600">
          個別に作成
        </label>
        <select
          id="individual-employee"
          value={individualEmployeeId}
          onChange={(e) => setIndividualEmployeeId(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">対象者を選択</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => handleCreateIndividual(false)}
          disabled={creatingIndividual}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {creatingIndividual && <Spinner />}
          白紙で作成
        </button>
        <button
          onClick={() => handleCreateIndividual(true)}
          disabled={creatingIndividual}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {creatingIndividual && <Spinner />}
          前回をコピーして作成
        </button>
        <span className="text-xs text-slate-400">
          「この月の明細を生成」の対象外（管理者など）の明細を、表示中の月に個別に作ります。
        </span>
      </div>

      <h3 className="mb-3 font-semibold">承認待ち</h3>
      {monthPending.length === 0 ? (
        <p className="text-slate-600">この月の承認待ち明細はありません</p>
      ) : (
        <div>
          <div className="mb-4 flex gap-2">
            <button
              onClick={handleApprove}
              disabled={loading || selected.size === 0}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "承認中..." : `選択した明細を承認 (${selected.size})`}
            </button>
            <button onClick={toggleAll} className="rounded-lg border px-4 py-2 text-sm">
              {selected.size === monthPending.length ? "全解除" : "全選択"}
            </button>
          </div>
          <div className="mb-4">
            <SendForReviewButton
              key={selectedMonth}
              payslipIds={Array.from(selected)}
              presidentEmail={presidentEmail}
              defaultSubject={fillReviewMailTemplate(reviewMailTemplate.subject, {
                会社名: companyName,
                期間: monthLabel(selectedMonth),
                人数: selected.size,
              })}
              defaultBody={fillReviewMailTemplate(reviewMailTemplate.body, {
                会社名: companyName,
                期間: monthLabel(selectedMonth),
                人数: selected.size,
              })}
            />
          </div>
          <div className="space-y-2">
            {monthPending.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4"
                />
                <Link
                  href={`/admin/payroll/${p.periodId}/${p.employeeId}`}
                  className="flex flex-1 items-center justify-between hover:underline"
                >
                  <div>
                    <p className="font-medium">
                      {p.employeeName}
                      {p.reviewRequestedAt && (
                        <span className="ml-2 rounded bg-blue-50 px-2 py-0.5 text-xs font-normal text-blue-700">
                          確認依頼済み（{formatSentDate(p.reviewRequestedAt)} 送信）
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-600">{p.periodLabel}</p>
                  </div>
                  <p className="font-bold">{formatCurrency(p.netPay)}</p>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">確定済み</h3>
        <SendToAccountantButton
          key={selectedMonth}
          payslipIds={monthApproved.map((p) => p.id)}
          defaultEmail={taxAccountantEmail}
          defaultSubject={`【${companyName}】${monthLabel(selectedMonth)} 給与明細のご送付`}
          defaultBody={`いつもお世話になっております。\n${monthLabel(selectedMonth)}分の給与明細（確定済み ${monthApproved.length}名分）を添付にてお送りいたします。\nご確認のほど、よろしくお願いいたします。\n\n${companyName}`}
        />
      </div>
      {monthApproved.length === 0 ? (
        <p className="text-slate-600">この月の確定済み明細はありません</p>
      ) : (
        <div className="space-y-2">
          {monthApproved.map((p) => (
            <Link
              key={p.id}
              href={`/admin/payslips/${p.id}`}
              className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow-sm hover:shadow-md"
            >
              <div>
                <p className="font-medium">{p.employeeName}</p>
                <p className="text-sm text-slate-600">{p.periodLabel}</p>
              </div>
              <p className="font-bold">{formatCurrency(p.netPay)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
