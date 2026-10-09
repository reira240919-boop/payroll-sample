"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DAILY_REPORT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/payroll";
import { monthKey, monthLabel, toDateString } from "@/lib/date-utils";

interface Report {
  id: string;
  date: string | Date;
  siteName: string;
  workHours: number;
  overtimeHours: number;
  status: string;
}

export default function EmployeeDailyReportList({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMonth = monthKey(new Date());

  const availableMonths = useMemo(() => {
    const keys = new Set(reports.map((r) => monthKey(r.date)));
    keys.add(currentMonth);
    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1));
  }, [reports, currentMonth]);

  const selectedMonth = searchParams.get("month") || currentMonth;

  function setSelectedMonth(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const filteredReports = reports.filter((r) => monthKey(r.date) === selectedMonth);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
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
              {key === currentMonth ? "（今月）" : ""}
            </option>
          ))}
        </select>
      </div>

      {filteredReports.length === 0 ? (
        <p className="text-slate-600">この月の日報はありません</p>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const dateStr = toDateString(new Date(report.date));
            const editable = report.status === "draft" || report.status === "submitted";

            return (
              <div key={report.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{formatDate(report.date)}</p>
                    <p className="text-slate-700">{report.siteName}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      report.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : report.status === "submitted"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {DAILY_REPORT_STATUS_LABELS[report.status] || report.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <div className="flex gap-4 text-sm text-slate-600">
                    <span>作業: {report.workHours}h</span>
                    <span>残業: {report.overtimeHours}h</span>
                  </div>
                  {editable && (
                    <Link
                      href={`/employee/daily-reports/new?date=${dateStr}&edit=${report.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      修正
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
