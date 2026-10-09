import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/payroll";
import { calcConsumptionTax } from "@/lib/invoice";
import BackButton from "@/components/BackButton";
import NewInvoiceButton from "@/components/NewInvoiceButton";

type Props = { params: Promise<{ contractorId: string }> };

export default async function InvoiceContractorPage({ params }: Props) {
  const { contractorId } = await params;

  const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
  if (!contractor) notFound();

  const invoices = await prisma.invoice.findMany({
    where: { contractorId },
    include: { lines: true },
    orderBy: { issueDate: "desc" },
  });

  return (
    <div>
      <BackButton label="請求書一覧に戻る" fallbackHref="/admin/invoices" />
      <p className="mb-1 text-sm text-slate-500">請求書 &gt; {contractor.name}</p>
      <h2 className="mb-4 text-xl font-bold">{contractor.name}</h2>

      <div className="mb-6">
        <NewInvoiceButton contractorId={contractorId} latestInvoiceId={invoices[0]?.id ?? null} />
      </div>

      <div className="space-y-2">
        {invoices.length === 0 && (
          <p className="text-sm text-slate-500">まだ請求書がありません。</p>
        )}
        {invoices.map((inv) => {
          const chargeLines = inv.lines.filter((l) => l.section !== "deduction");
          const deductionLines = inv.lines.filter((l) => l.section === "deduction");
          const chargeTotal = chargeLines.reduce((s, l) => s + l.amount, 0);
          const deductionTotal = deductionLines.reduce((s, l) => s + l.amount, 0);
          const { tax: chargeTax } = calcConsumptionTax(chargeLines);
          const { tax: deductionTax } = calcConsumptionTax(deductionLines);
          const total = chargeTotal + chargeTax - (deductionTotal + deductionTax);
          return (
            <Link
              key={inv.id}
              href={`/admin/invoices/${contractorId}/${inv.id}`}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm hover:bg-slate-50"
            >
              <div>
                <p className="font-semibold text-slate-900">{inv.periodLabel}</p>
                <p className="text-sm text-slate-500">{formatDate(inv.issueDate)}発行</p>
                <div className="mt-1 flex gap-1">
                  {inv.emailSentAt && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      送信済み
                    </span>
                  )}
                  {inv.mailed && (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      郵送済み
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm font-bold tabular-nums">{formatCurrency(total)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
