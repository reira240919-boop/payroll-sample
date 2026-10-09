import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatCurrency, formatDate, recalcPayslipTotals } from "@/lib/payroll";

export default async function EmployeePayslipsPage() {
  const session = await getSession();

  const payslips = await prisma.payslip.findMany({
    where: { employeeId: session.employeeId, status: "approved" },
    include: { payrollPeriod: true },
    orderBy: { approvedAt: "desc" },
  });

  const payslipsWithTotals = await Promise.all(
    payslips.map(async (p) => ({
      ...p,
      ...(await recalcPayslipTotals(p.id)),
    }))
  );

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">給与明細</h2>
      <p className="mb-4 text-sm text-slate-600">確定済みの明細のみ表示されます。</p>
      {payslipsWithTotals.length === 0 ? (
        <p className="text-slate-600">確定済みの給与明細はありません</p>
      ) : (
        <div className="space-y-3">
          {payslipsWithTotals.map((payslip) => (
            <Link
              key={payslip.id}
              href={`/employee/payslips/${payslip.id}`}
              className="block rounded-xl bg-white p-4 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {formatDate(payslip.payrollPeriod.startDate)} 〜{" "}
                    {formatDate(payslip.payrollPeriod.endDate)}
                  </p>
                  <p className="text-sm text-slate-600">
                    確定日: {payslip.approvedAt ? formatDate(payslip.approvedAt) : "-"}
                  </p>
                </div>
                <p className="text-lg font-bold text-blue-700">
                  {formatCurrency(payslip.netPay)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
