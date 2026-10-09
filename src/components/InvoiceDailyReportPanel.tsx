"use client";

import { useEffect, useState } from "react";
import { DAILY_REPORT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/payroll";
import { monthKey, monthLabel } from "@/lib/date-utils";

interface Report {
  id: string;
  date: string;
  siteName: string;
  contractorName: string | null;
  workHours: number;
  overtimeHours: number;
  status: string;
  employee: { id: string; name: string };
}

function monthOptions(): string[] {
  const now = new Date();
  const options: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(monthKey(d));
  }
  return options;
}

export default function InvoiceDailyReportPanel({
  contractorName,
  onClose,
}: {
  contractorName: string;
  onClose: () => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");

  useEffect(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const params = new URLSearchParams({
      contractorName,
      from: `${selectedMonth}-01`,
      to: `${selectedMonth}-${String(lastDay).padStart(2, "0")}`,
    });
    setLoading(true);
    setError("");
    setEmployeeFilter("all");
    setSiteFilter("all");
    fetch(`/api/daily-reports?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Report[]) => setReports(data))
      .catch(() => setError("日報の取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [contractorName, selectedMonth]);

  const employeeOptions = Array.from(
    new Map(reports.map((r) => [r.employee.id, r.employee.name])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1], "ja"));

  const siteOptions = Array.from(new Set(reports.map((r) => r.siteName))).sort((a, b) =>
    a.localeCompare(b, "ja")
  );

  const filteredReports = reports
    .filter(
      (r) =>
        (employeeFilter === "all" || r.employee.id === employeeFilter) &&
        (siteFilter === "all" || r.siteName === siteFilter)
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalWork = filteredReports.reduce((s, r) => s + r.workHours, 0);
  const totalOvertime = filteredReports.reduce((s, r) => s + r.overtimeHours, 0);

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">日報確認：{contractorName}</h3>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
        >
          閉じる
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="invoice-daily-report-month" className="text-sm text-slate-600">
          対象月
        </label>
        <select
          id="invoice-daily-report-month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border px-3 py-1.5 text-sm"
        >
          {monthOptions().map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </select>
      </div>

      {reports.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label htmlFor="invoice-daily-report-employee" className="text-sm text-slate-600">
            従業員名
          </label>
          <select
            id="invoice-daily-report-employee"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            <option value="all">全員</option>
            {employeeOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <label htmlFor="invoice-daily-report-site" className="text-sm text-slate-600">
            現場
          </label>
          <select
            id="invoice-daily-report-site"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            <option value="all">すべての現場</option>
            {siteOptions.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">読み込み中...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-slate-500">この月の日報はありません。</p>
      ) : filteredReports.length === 0 ? (
        <p className="text-sm text-slate-500">条件に合う日報はありません。</p>
      ) : (
        <>
          {employeeFilter !== "all" && (
            <div className="mb-3 flex items-center gap-4 rounded-lg bg-sky-50 px-4 py-2.5">
              <span className="text-xs text-slate-500">{filteredReports.length}件</span>
              <span className="text-sm">
                <span className="text-slate-500">作業合計</span>{" "}
                <span className="text-base font-bold text-slate-900">{totalWork}h</span>
              </span>
              <span className="text-sm">
                <span className="text-slate-500">残業合計</span>{" "}
                <span className="text-base font-bold text-slate-900">{totalOvertime}h</span>
              </span>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b bg-slate-50 text-left">
                  <th className="px-2 py-1.5">日付</th>
                  <th className="px-2 py-1.5">従業員名</th>
                  <th className="px-2 py-1.5">現場</th>
                  <th className="px-2 py-1.5 text-right">作業</th>
                  <th className="px-2 py-1.5 text-right">残業</th>
                  <th className="px-2 py-1.5">状態</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 ${i % 2 === 1 ? "bg-sky-50" : ""}`}
                  >
                    <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-2 py-1.5">{r.employee.name}</td>
                    <td className="px-2 py-1.5">{r.siteName}</td>
                    <td className="px-2 py-1.5 text-right">{r.workHours}h</td>
                    <td className="px-2 py-1.5 text-right">{r.overtimeHours}h</td>
                    <td className="px-2 py-1.5">
                      {DAILY_REPORT_STATUS_LABELS[r.status] || r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
