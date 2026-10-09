import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  applyFixedAllowances,
  applyFixedDeductions,
  formatDate,
  generateEarningLinesFromReports,
  getEmployeePeriodRange,
  getOrCreatePayslip,
} from "@/lib/payroll";
import PayslipEditor from "@/components/PayslipEditor";
import BackButton from "@/components/BackButton";

type Props = {
  params: Promise<{ id: string; employeeId: string }>;
  searchParams: Promise<{ generate?: string }>;
};

export default async function AdminPayslipEditPage({ params, searchParams }: Props) {
  const { id: periodId, employeeId } = await params;
  const { generate } = await searchParams;

  const [period, employee] = await Promise.all([
    prisma.payrollPeriod.findUnique({ where: { id: periodId } }),
    prisma.employee.findUnique({ where: { id: employeeId } }),
  ]);

  if (!period || !employee) notFound();

  let payslip = await prisma.payslip.findUnique({
    where: { employeeId_payrollPeriodId: { employeeId, payrollPeriodId: periodId } },
  });

  if (!payslip || generate === "1") {
    payslip = await getOrCreatePayslip(employeeId, periodId);
    const range = getEmployeePeriodRange(employee.closingDay, period);
    await generateEarningLinesFromReports(payslip.id, employeeId, range.start, range.end);
    await applyFixedDeductions(payslip.id, employeeId);
    await applyFixedAllowances(payslip.id, employeeId);
    redirect(`/admin/payroll/${periodId}/${employeeId}`);
  }

  const advances = await prisma.salaryAdvance.findMany({
    where: { employeeId, balance: { gt: 0 } },
  });

  const range = getEmployeePeriodRange(employee.closingDay, period);

  return (
    <div>
      <BackButton label="戻る" fallbackHref="/admin/approvals" />
      <h2 className="mb-2 text-xl font-bold">{employee.name} の給与明細</h2>
      <p className="mb-4 text-sm text-slate-600">
        {formatDate(range.start)} 〜 {formatDate(range.end)}
        {employee.closingDay && (
          <span className="ml-2 text-slate-400">（{employee.closingDay}日締め）</span>
        )}
      </p>
      <PayslipEditor
        payslipId={payslip.id}
        periodId={periodId}
        employeeId={employeeId}
        advances={advances}
      />
    </div>
  );
}
