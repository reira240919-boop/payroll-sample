import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, getEmployeePeriodRange, recalcPayslipTotals } from "@/lib/payroll";
import { getCompanyInfo, getPresidentEmail, getReviewMailTemplate } from "@/lib/settings";
import ApprovalsView from "@/components/ApprovalsView";

async function buildItems(status: "draft" | "approved") {
  const payslips = await prisma.payslip.findMany({
    where: { status },
    include: {
      employee: { select: { id: true, name: true, closingDay: true } },
      payrollPeriod: true,
    },
    orderBy: [{ payrollPeriod: { startDate: "desc" } }, { employee: { name: "asc" } }],
  });

  return Promise.all(
    payslips.map(async (p) => {
      const range = getEmployeePeriodRange(p.employee.closingDay, p.payrollPeriod);
      return {
        id: p.id,
        employeeId: p.employee.id,
        employeeName: p.employee.name,
        periodId: p.payrollPeriodId,
        periodStart: p.payrollPeriod.startDate.toISOString(),
        periodLabel: `${formatDate(range.start)} 〜 ${formatDate(range.end)}`,
        reviewRequestedAt: p.reviewRequestedAt ? p.reviewRequestedAt.toISOString() : null,
        ...(await recalcPayslipTotals(p.id)),
      };
    })
  );
}

export default async function AdminApprovalsPage() {
  const [pending, approved, companyInfo, presidentEmail, reviewMailTemplate] = await Promise.all([
    buildItems("draft"),
    buildItems("approved"),
    getCompanyInfo(),
    getPresidentEmail(),
    getReviewMailTemplate(),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">承認・確定</h2>
        <Link
          href="/admin/approvals/settings"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          設定
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        「この月の明細を生成」で日報から自動集計します。承認待ちの明細は名前をタップすると内訳の修正（元請け分の手動反映など）ができます。承認すると、従業員がWebで閲覧・PDFダウンロードできるようになります。確定済みの明細は名前をタップすると内訳を確認できます。
      </p>
      <ApprovalsView
        pending={pending}
        approved={approved}
        companyName={companyInfo.name}
        taxAccountantEmail={companyInfo.taxAccountantEmail}
        presidentEmail={presidentEmail}
        reviewMailTemplate={reviewMailTemplate}
      />
    </div>
  );
}
