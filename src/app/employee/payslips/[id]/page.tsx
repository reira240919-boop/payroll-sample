import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatDate, recalcPayslipTotals } from "@/lib/payroll";
import BackButton from "@/components/BackButton";
import PayslipLines from "@/components/PayslipLines";
import PdfDownloadButton from "@/components/PdfDownloadButton";

type Props = { params: Promise<{ id: string }> };

export default async function EmployeePayslipDetailPage({ params }: Props) {
  const session = await getSession();
  const { id } = await params;

  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: {
      employee: true,
      payrollPeriod: true,
      earningLines: { orderBy: { sortOrder: "asc" } },
      deductionLines: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!payslip || payslip.employeeId !== session.employeeId) {
    notFound();
  }

  if (payslip.status !== "approved") {
    notFound();
  }

  const totals = await recalcPayslipTotals(id);

  return (
    <div>
      <BackButton label="一覧に戻る" fallbackHref="/employee/payslips" />
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">給与明細</h2>
            <p className="text-slate-600">
              {formatDate(payslip.payrollPeriod.startDate)} 〜{" "}
              {formatDate(payslip.payrollPeriod.endDate)}
            </p>
          </div>
          <PdfDownloadButton
            href={`/api/payslips/${id}/pdf`}
            label="PDFダウンロード"
            download={`給与明細_${payslip.employee.name}.pdf`}
            className="shrink-0 whitespace-nowrap self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          />
        </div>

        <PayslipLines
          earningLines={payslip.earningLines}
          deductionLines={payslip.deductionLines}
          totalEarnings={totals.totalEarnings}
          totalDeductions={totals.totalDeductions}
          netPay={totals.netPay}
        />
      </div>
    </div>
  );
}
