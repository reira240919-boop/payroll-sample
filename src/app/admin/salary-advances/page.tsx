import { prisma } from "@/lib/db";
import SalaryAdvanceForm from "@/components/SalaryAdvanceForm";
import SalaryAdvanceLedger from "@/components/SalaryAdvanceLedger";

export default async function AdminSalaryAdvancesPage() {
  const [advances, employees] = await Promise.all([
    prisma.salaryAdvance.findMany({
      include: {
        employee: { select: { id: true, name: true } },
        repayments: { orderBy: { repaidAt: "desc" } },
      },
      orderBy: { loanDate: "desc" },
    }),
    prisma.employee.findMany({
      where: { role: "employee", active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">前払い台帳</h2>
      <SalaryAdvanceForm employees={employees} />
      <SalaryAdvanceLedger advances={advances} />
    </div>
  );
}
