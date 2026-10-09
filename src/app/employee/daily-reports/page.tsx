import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import EmployeeDailyReportList from "@/components/EmployeeDailyReportList";

export default async function EmployeeDailyReportsPage() {
  const session = await getSession();

  const reports = await prisma.dailyReport.findMany({
    where: { employeeId: session.employeeId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">日報一覧</h2>
        <Link
          href="/employee/daily-reports/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          日報入力
        </Link>
      </div>
      <EmployeeDailyReportList reports={reports} />
    </div>
  );
}
