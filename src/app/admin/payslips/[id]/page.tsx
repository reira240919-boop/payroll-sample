import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PAYSLIP_STATUS_LABELS } from "@/lib/constants";
import { formatDate, recalcPayslipTotals } from "@/lib/payroll";
import BackButton from "@/components/BackButton";
import PayslipLines from "@/components/PayslipLines";
import PdfDownloadButton from "@/components/PdfDownloadButton";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPayslipPreviewPage({ params }: Props) {
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

  if (!payslip) notFound();

  const totals = await recalcPayslipTotals(id);

  return (
    <div>
      <BackButton label="戻る" fallbackHref="/admin/approvals" />
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{payslip.employee.name} の給与明細</h2>
            <p className="text-slate-600">
              {formatDate(payslip.payrollPeriod.startDate)} 〜{" "}
              {formatDate(payslip.payrollPeriod.endDate)}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {PAYSLIP_STATUS_LABELS[payslip.status] || payslip.status}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <PdfDownloadButton
              href={`/api/payslips/${id}/pdf`}
              label="PDFプレビュー"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            />
            <Link
              href={`/admin/payroll/${payslip.payrollPeriodId}/${payslip.employeeId}`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              編集する
            </Link>
          </div>
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
