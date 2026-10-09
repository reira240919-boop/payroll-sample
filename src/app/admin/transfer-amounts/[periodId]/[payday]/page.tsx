import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency, recalcPayslipTotals } from "@/lib/payroll";
import BackButton from "@/components/BackButton";
import TransferAmountTable from "@/components/TransferAmountTable";
import TransferNoticeStatus from "@/components/TransferNoticeStatus";
import { getPresidentEmail } from "@/lib/settings";
import { UNSET_PAYDAY } from "@/lib/transfer-notice";

type Props = { params: Promise<{ periodId: string; payday: string }> };

export default async function TransferAmountsPaydayPage({ params }: Props) {
  const { periodId, payday: paydayParam } = await params;
  const payday = decodeURIComponent(paydayParam);

  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) notFound();

  const payslips = await prisma.payslip.findMany({
    where: { payrollPeriodId: periodId, status: "approved" },
    include: {
      employee: { select: { name: true, payday: true, paymentMethod: true } },
    },
  });

  const matching = payslips.filter((p) => (p.employee.payday || UNSET_PAYDAY) === payday);

  const bankRows: { payslipId: string; name: string; amount: number; transferConfirmed: boolean }[] = [];
  const cashRows: { payslipId: string; name: string; amount: number; transferConfirmed: boolean }[] = [];

  for (const payslip of matching) {
    const { netPay } = await recalcPayslipTotals(payslip.id);
    const row = {
      payslipId: payslip.id,
      name: payslip.employee.name,
      amount: netPay,
      transferConfirmed: payslip.transferConfirmed,
    };
    if (payslip.employee.paymentMethod === "手渡し") {
      cashRows.push(row);
    } else {
      bankRows.push(row);
    }
  }

  // 振込の人が全員チェック済みなら、社長への振込完了メールの状態を出す
  const bankPayslips = matching.filter((p) => p.employee.paymentMethod !== "手渡し");
  const allBankConfirmed = bankPayslips.length > 0 && bankPayslips.every((p) => p.transferConfirmed);
  const noticeSentAt = bankPayslips.find((p) => p.transferNoticeSentAt)?.transferNoticeSentAt ?? null;
  const presidentEmail = allBankConfirmed ? await getPresidentEmail() : "";

  const grandTotal = [...bankRows, ...cashRows].reduce((s, r) => s + r.amount, 0);
  const monthLabel = `${period.startDate.getFullYear()}年${period.startDate.getMonth() + 1}月`;
  const paydayLabel = payday === UNSET_PAYDAY ? "振込日未設定" : `${payday}振込分`;

  return (
    <div>
      <BackButton label="振込日一覧に戻る" fallbackHref={`/admin/transfer-amounts/${periodId}`} />
      <p className="mb-1 text-sm text-slate-500">
        振込金額一覧 &gt; {monthLabel} &gt; {paydayLabel}
      </p>
      <h2 className="mb-4 text-xl font-bold">振込金額一覧</h2>

      {allBankConfirmed && (
        <TransferNoticeStatus
          periodId={periodId}
          payday={payday}
          sentAt={noticeSentAt ? noticeSentAt.toISOString() : null}
          hasPresidentEmail={Boolean(presidentEmail)}
        />
      )}

      <TransferAmountTable rows={bankRows} label="振込" notice={{ periodId, payday }} />
      <TransferAmountTable rows={cashRows} label="手渡し" />

      <div className="flex items-center justify-between rounded-xl bg-blue-50 p-4">
        <span className="text-sm font-medium text-slate-700">
          合計（{bankRows.length + cashRows.length}名）
        </span>
        <span className="text-lg font-extrabold tabular-nums text-blue-700">
          {formatCurrency(grandTotal)}
        </span>
      </div>
    </div>
  );
}
