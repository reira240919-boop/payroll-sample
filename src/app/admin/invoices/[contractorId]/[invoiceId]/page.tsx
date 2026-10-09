import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/payroll";
import { calcConsumptionTax } from "@/lib/invoice";
import { getCompanyInfo, fillInvoiceMailTemplate } from "@/lib/settings";
import BackButton from "@/components/BackButton";
import PdfDownloadButton from "@/components/PdfDownloadButton";
import SendInvoiceButton from "@/components/SendInvoiceButton";
import MailedCheckbox from "@/components/MailedCheckbox";

type Props = { params: Promise<{ contractorId: string; invoiceId: string }> };

export default async function InvoicePreviewPage({ params }: Props) {
  const { contractorId, invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      contractor: { select: { id: true, name: true, email: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice || invoice.contractorId !== contractorId) notFound();

  const companyInfo = await getCompanyInfo();
  const mailVars = {
    会社名: companyInfo.name,
    契約者名: invoice.contractor.name,
    期間: invoice.periodLabel,
  };
  const defaultSubject = fillInvoiceMailTemplate(companyInfo.invoiceMailSubject, mailVars);
  const defaultBody = fillInvoiceMailTemplate(companyInfo.invoiceMailBody, mailVars);

  const chargeLines = invoice.lines.filter((l) => l.section !== "deduction");
  const deductionLines = invoice.lines.filter((l) => l.section === "deduction");
  const chargeTotal = chargeLines.reduce((s, l) => s + l.amount, 0);
  const deductionTotal = deductionLines.reduce((s, l) => s + l.amount, 0);
  const { tax: chargeTax } = calcConsumptionTax(chargeLines);
  const { tax: deductionTax } = calcConsumptionTax(deductionLines);
  const chargeGrandTotal = chargeTotal + chargeTax;
  const deductionGrandTotal = deductionTotal + deductionTax;
  const total = chargeGrandTotal - deductionGrandTotal;

  const groupOrder: string[] = [];
  const groupedLines = new Map<string, typeof chargeLines>();
  const ungroupedLines: typeof chargeLines = [];
  for (const line of chargeLines) {
    if (line.groupLabel) {
      if (!groupedLines.has(line.groupLabel)) {
        groupedLines.set(line.groupLabel, []);
        groupOrder.push(line.groupLabel);
      }
      groupedLines.get(line.groupLabel)!.push(line);
    } else {
      ungroupedLines.push(line);
    }
  }

  return (
    <div>
      <BackButton label="請求書一覧に戻る" fallbackHref={`/admin/invoices/${contractorId}`} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">請求書プレビュー</h2>
        <div className="flex flex-wrap items-start gap-2">
          <Link
            href={`/admin/invoices/${contractorId}/${invoiceId}/edit`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            修正
          </Link>
          <PdfDownloadButton
            href={`/api/invoices/${invoiceId}/pdf`}
            label="PDFプレビュー"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          />
          <SendInvoiceButton
            invoiceId={invoiceId}
            defaultEmail={invoice.contractor.email}
            defaultSubject={defaultSubject}
            defaultBody={defaultBody}
          />
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">請求先：{invoice.contractor.name}</p>
        <p className="text-sm text-slate-500">
          発行日：{formatDate(invoice.issueDate)}／{invoice.periodLabel}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {invoice.emailSentAt && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              送信済み（{formatDate(invoice.emailSentAt)}）
            </span>
          )}
          <MailedCheckbox invoiceId={invoiceId} initialMailed={invoice.mailed} />
        </div>
        <p className="mt-2 inline-block rounded bg-sky-50 px-3 py-2 text-2xl font-extrabold tabular-nums text-blue-700">
          ご請求金額 {formatCurrency(total)}
        </p>

        <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">
          請求項目
        </h3>
        {chargeLines.length === 0 && <p className="text-sm text-slate-500">項目がありません。</p>}
        <div className="space-y-4">
          {groupOrder.map((groupLabel) => (
            <div key={groupLabel}>
              <p className="mb-1 text-sm font-bold text-slate-900">{groupLabel}</p>
              <table className="w-full text-sm">
                <tbody>
                  {groupedLines.get(groupLabel)!.map((line) => (
                    <tr key={line.id} className="border-b border-slate-100">
                      <td className="whitespace-pre-line py-1.5 pr-2">{line.content}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-slate-500">
                        {line.quantity ?? ""}
                        {line.unit || ""}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-slate-500">
                        {line.unitPrice != null ? formatCurrency(line.unitPrice) : ""}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums font-medium">
                        {formatCurrency(line.amount)}
                      </td>
                      <td className="py-1.5 text-right text-xs text-slate-400">
                        {line.taxCategory || ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {ungroupedLines.length > 0 && (
            <table className="w-full text-sm">
              <tbody>
                {ungroupedLines.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100">
                    <td className="whitespace-pre-line py-1.5 pr-2">{line.content}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-500">
                      {line.quantity ?? ""}
                      {line.unit || ""}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-500">
                      {line.unitPrice != null ? formatCurrency(line.unitPrice) : ""}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-medium">
                      {formatCurrency(line.amount)}
                    </td>
                    <td className="py-1.5 text-right text-xs text-slate-400">
                      {line.taxCategory || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-end text-slate-500">小計：{formatCurrency(chargeTotal)}</div>
          <div className="flex justify-end text-slate-500">
            消費税(10%)：{formatCurrency(chargeTax)}
          </div>
          <div className="flex justify-end font-bold">合計：{formatCurrency(chargeGrandTotal)}</div>
        </div>

        {deductionLines.length > 0 && (
          <>
            <h3 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">
              控除項目
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {deductionLines.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100">
                    <td className="whitespace-pre-line py-1.5 pr-2">{line.content}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-500">
                      {line.quantity ?? ""}個
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-500">
                      {line.unitPrice != null ? formatCurrency(line.unitPrice) : ""}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums font-medium">
                      {formatCurrency(line.amount)}
                    </td>
                    <td className="py-1.5 text-right text-xs text-slate-400">
                      {line.taxCategory || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-end text-slate-500">
                控除小計：−{formatCurrency(deductionTotal)}
              </div>
              <div className="flex justify-end text-slate-500">
                消費税：−{formatCurrency(deductionTax)}
              </div>
              <div className="flex justify-end font-bold">
                控除合計：−{formatCurrency(deductionGrandTotal)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
