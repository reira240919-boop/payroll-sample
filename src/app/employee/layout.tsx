import Nav from "@/components/Nav";
import { requirePageAuth } from "@/lib/auth-page";
import { prisma } from "@/lib/db";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageAuth("employee");

  const advanceCount = await prisma.salaryAdvance.count({
    where: { employeeId: session.employeeId },
  });

  const links = [
    { href: "/employee/daily-reports/new", label: "日報入力" },
    { href: "/employee/daily-reports", label: "日報一覧" },
    { href: "/employee/payslips", label: "給与明細" },
    ...(advanceCount > 0 ? [{ href: "/employee/salary-advance", label: "前払い" }] : []),
    { href: "/employee/settings", label: "設定" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav links={links} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
