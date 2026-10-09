"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DAILY_REPORT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/payroll";
import { monthKey, monthLabel } from "@/lib/date-utils";
import AdminDailyReportActions from "@/components/AdminDailyReportActions";

interface Employee {
  id: string;
  name: string;
}

interface Report {
  id: string;
  date: string | Date;
  siteName: string;
  contractorName?: string | null;
  workHours: number;
  overtimeHours: number;
  status: string;
  employeeId: string;
}

export default function AdminDailyReportGroups({
  reports,
  employees,
}: {
  reports: Report[];
  employees: Employee[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const availableMonths = useMemo(() => {
    const keys = new Set(reports.map((r) => monthKey(r.date)));
    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1));
  }, [reports]);

  const selectedMonth = searchParams.get("month") || availableMonths[0] || monthKey(new Date());

  function setSelectedMonth(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const filteredReports =
    selectedMonth === "all" ? reports : reports.filter((r) => monthKey(r.date) === selectedMonth);

  const groups = employees
    .map((employee) => ({
      employee,
      reports: filteredReports
        .filter((r) => r.employeeId === employee.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))
    .filter((g) => g.reports.length > 0);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="month-filter" className="text-sm text-slate-600">
          表示月
        </label>
        <select
          id="month-filter"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {availableMonths.map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
          <option value="all">すべて</option>
        </select>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-slate-500">この月の日報はありません。</p>
      ) : (
        <div className="space-y-3">
          {groups.map(({ employee, reports: empReports }) => {
            const isOpen = openIds.has(employee.id);
            const totalWork = empReports.reduce((s, r) => s + r.workHours, 0);
            const totalOvertime = empReports.reduce((s, r) => s + r.overtimeHours, 0);

            return (
              <div key={employee.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => toggle(employee.id)}
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
                    <span className="font-semibold text-slate-900">{employee.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {empReports.length}件
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    作業 {totalWork}h / 残業 {totalOvertime}h
                  </div>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left">
                          <th className="px-4 py-2">日付</th>
                          <th className="px-4 py-2">現場</th>
                          <th className="px-4 py-2 text-right">作業</th>
                          <th className="px-4 py-2 text-right">残業</th>
                          <th className="px-4 py-2">状態</th>
                          <th className="px-4 py-2">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empReports.map((report) => (
                          <tr key={report.id} className="border-b border-slate-100">
                            <td className="px-4 py-2">{formatDate(report.date)}</td>
                            <td className="px-4 py-2">
                              {report.siteName}
                              {report.contractorName && (
                                <span className="block text-xs text-slate-400">
                                  元請け: {report.contractorName}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">{report.workHours}h</td>
                            <td className="px-4 py-2 text-right">{report.overtimeHours}h</td>
                            <td className="px-4 py-2">
                              {DAILY_REPORT_STATUS_LABELS[report.status] || report.status}
                            </td>
                            <td className="px-4 py-2">
                              <AdminDailyReportActions
                                employees={employees}
                                report={report}
                                compact
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
