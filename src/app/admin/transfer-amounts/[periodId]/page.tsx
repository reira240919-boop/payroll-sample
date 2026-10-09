import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency, recalcPayslipTotals } from "@/lib/payroll";
import BackButton from "@/components/BackButton";

const UNSET_PAYDAY = "未設定";

type Props = { params: Promise<{ periodId: string }> };

export default async function TransferAmountsPeriodPage({ params }: Props) {
  const { periodId } = await params;

  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) notFound();

  const payslips = await prisma.payslip.findMany({
    where: { payrollPeriodId: periodId, status: "approved" },
    include: { employee: { select: { payday: true } } },
  });

  const groups = new Map<string, { count: number; total: number }>();

  for (const payslip of payslips) {
    const key = payslip.employee.payday || UNSET_PAYDAY;
    const { netPay } = await recalcPayslipTotals(payslip.id);
    const group = groups.get(key) || { count: 0, total: 0 };
    group.count += 1;
    group.total += netPay;
    groups.set(key, group);
  }

  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === UNSET_PAYDAY) return 1;
    if (b === UNSET_PAYDAY) return -1;
    return a.localeCompare(b, "ja");
  });

  const label = `${period.startDate.getFullYear()}年${period.startDate.getMonth() + 1}月`;

  return (
    <div>
      <BackButton label="振込金額一覧に戻る" fallbackHref="/admin/transfer-amounts" />
      <p className="mb-1 text-sm text-slate-500">振込金額一覧 &gt; {label}</p>
      <h2 className="mb-4 text-xl font-bold">振込日を選択</h2>
      <div className="space-y-2">
        {sortedKeys.map((key) => {
          const group = groups.get(key)!;
          return (
            <Link
              key={key}
              href={`/admin/transfer-amounts/${periodId}/${encodeURIComponent(key)}`}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm hover:bg-slate-50"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {key === UNSET_PAYDAY ? "振込日未設定" : `${key}振込分`}
                </p>
                <p className="text-sm text-slate-500">
                  {group.count}名・合計 {formatCurrency(group.total)}
                </p>
              </div>
              <span className="text-slate-400">›</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
