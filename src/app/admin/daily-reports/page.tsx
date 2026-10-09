import { prisma } from "@/lib/db";
import AdminDailyReportActions from "@/components/AdminDailyReportActions";
import AdminDailyReportGroups from "@/components/AdminDailyReportGroups";

export default async function AdminDailyReportsPage() {
  const [reports, employees] = await Promise.all([
    prisma.dailyReport.findMany({
      include: { employee: { select: { id: true, name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 1000,
    }),
    prisma.employee.findMany({
      where: { role: "employee", active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">日報管理</h2>
      <AdminDailyReportActions employees={employees} />
      {reports.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">日報がまだありません。</p>
      ) : (
        <AdminDailyReportGroups reports={reports} employees={employees} />
      )}
    </div>
  );
}
