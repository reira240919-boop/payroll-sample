import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import React from "react";
import { prisma } from "@/lib/db";
import { recalcPayslipTotals } from "@/lib/payroll";
import { PayslipDocument } from "@/lib/pdf";
import { getCompanyInfo } from "@/lib/settings";

export async function generatePayslipPdf(payslipId: string) {
  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: true,
      payrollPeriod: true,
      earningLines: { orderBy: { sortOrder: "asc" } },
      deductionLines: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!payslip) return null;

  const totals = await recalcPayslipTotals(payslipId);
  const start = payslip.payrollPeriod.startDate;
  const periodMonthLabel = `${start.getFullYear()}年${start.getMonth() + 1}月分`;
  const companyInfo = await getCompanyInfo();

  const doc = React.createElement(PayslipDocument, {
    data: {
      employeeName: payslip.employee.name,
      periodMonthLabel,
      registrationNumber: payslip.employee.invoiceRegistrationNumber,
      earningLines: payslip.earningLines,
      deductionLines: payslip.deductionLines,
      totalEarnings: totals.totalEarnings,
      totalDeductions: totals.totalDeductions,
      netPay: totals.netPay,
      logoDataUrl: companyInfo.logoDataUrl,
      sealDataUrl: companyInfo.sealDataUrl,
    },
  }) as ReactElement;

  const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
  const filename = `給与明細_${payslip.employee.name}_${start.toISOString().slice(0, 7)}.pdf`;

  return {
    buffer,
    filename,
    employeeName: payslip.employee.name,
    periodMonthLabel,
    status: payslip.status,
  };
}
