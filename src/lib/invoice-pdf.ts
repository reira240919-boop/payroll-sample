import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import React from "react";
import { prisma } from "@/lib/db";
import { getCompanyInfo } from "@/lib/settings";
import { formatDate } from "@/lib/payroll";
import { InvoiceDocument } from "@/lib/pdf";

export async function generateInvoicePdf(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      contractor: { select: { name: true, email: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!invoice) return null;

  const companyInfo = await getCompanyInfo();

  const chargeLines = invoice.lines.filter((l) => l.section !== "deduction");
  const deductionLines = invoice.lines.filter((l) => l.section === "deduction");
  const chargeTotal = chargeLines.reduce((s, l) => s + l.amount, 0);
  const deductionTotal = deductionLines.reduce((s, l) => s + l.amount, 0);

  const groupOrder: (string | null)[] = [];
  const grouped = new Map<string | null, typeof chargeLines>();
  for (const line of chargeLines) {
    const key = line.groupLabel || null;
    if (!grouped.has(key)) {
      grouped.set(key, []);
      groupOrder.push(key);
    }
    grouped.get(key)!.push(line);
  }
  const chargeGroups = groupOrder.map((groupLabel) => ({
    groupLabel,
    lines: grouped.get(groupLabel)!,
  }));

  const doc = React.createElement(InvoiceDocument, {
    data: {
      contractorName: invoice.contractor.name,
      issueDate: formatDate(invoice.issueDate),
      periodLabel: invoice.periodLabel,
      chargeGroups,
      deductionLines,
      chargeTotal,
      deductionTotal,
      bank: {
        bankName: companyInfo.bankName,
        bankBranch: companyInfo.bankBranch,
        bankAccountType: companyInfo.bankAccountType,
        bankAccountNumber: companyInfo.bankAccountNumber,
        bankAccountHolder: companyInfo.bankAccountHolder,
      },
      company: {
        name: companyInfo.name,
        postalCode: companyInfo.postalCode,
        address: companyInfo.address,
        phone: companyInfo.phone,
        fax: companyInfo.fax,
        invoiceRegistrationNumber: companyInfo.invoiceRegistrationNumber,
      },
      memo: invoice.memo,
      logoDataUrl: companyInfo.logoDataUrl,
      sealDataUrl: companyInfo.sealDataUrl,
    },
  }) as ReactElement;

  const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
  const filename = `請求書_${invoice.contractor.name}_${invoice.periodLabel}.pdf`;

  return {
    buffer,
    filename,
    contractorName: invoice.contractor.name,
    contractorEmail: invoice.contractor.email,
    periodLabel: invoice.periodLabel,
    companyName: companyInfo.name,
    invoiceMailSubject: companyInfo.invoiceMailSubject,
    invoiceMailBody: companyInfo.invoiceMailBody,
  };
}
