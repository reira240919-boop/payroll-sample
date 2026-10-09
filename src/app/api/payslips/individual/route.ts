import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getOrCreatePayslip } from "@/lib/payroll";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const employeeId = String(body.employeeId || "");
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const copyFromPrevious = Boolean(body.copyFromPrevious);

    if (!employeeId || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }

    let period = await prisma.payrollPeriod.findFirst({ where: { startDate, endDate } });
    if (!period) {
      period = await prisma.payrollPeriod.create({ data: { startDate, endDate } });
    }

    const payslip = await getOrCreatePayslip(employeeId, period.id);

    if (copyFromPrevious) {
      const [earningCount, deductionCount] = await Promise.all([
        prisma.payslipEarningLine.count({ where: { payslipId: payslip.id } }),
        prisma.payslipDeductionLine.count({ where: { payslipId: payslip.id } }),
      ]);

      if (earningCount === 0 && deductionCount === 0) {
        const previous = await prisma.payslip.findFirst({
          where: {
            employeeId,
            id: { not: payslip.id },
            payrollPeriod: { startDate: { lt: startDate } },
          },
          include: { earningLines: true, deductionLines: true },
          orderBy: { payrollPeriod: { startDate: "desc" } },
        });

        if (previous) {
          if (previous.earningLines.length > 0) {
            await prisma.payslipEarningLine.createMany({
              data: previous.earningLines.map((l) => ({
                payslipId: payslip.id,
                siteName: l.siteName,
                contractorName: l.contractorName,
                workType: l.workType,
                hours: l.hours,
                quantityUnit: l.quantityUnit,
                rate: l.rate,
                amount: l.amount,
                taxable: l.taxable,
                memo: l.memo,
                lineType: "manual",
                sortOrder: l.sortOrder,
              })),
            });
          }
          // Skip "advance" lines: copying one directly would create a
          // deduction that looks linked to a 前払い repayment but isn't
          // (allocateAdvanceRepayment never ran for it) — the exact bug
          // fixed earlier. Fixed deductions get re-applied by
          // applyFixedDeductions from the employee's own template, not
          // copied ad hoc, so map those to "variable" too.
          const copyableDeductions = previous.deductionLines.filter(
            (l) => l.lineType !== "advance"
          );
          if (copyableDeductions.length > 0) {
            await prisma.payslipDeductionLine.createMany({
              data: copyableDeductions.map((l) => ({
                payslipId: payslip.id,
                itemName: l.itemName,
                quantity: l.quantity,
                amount: l.amount,
                taxable: l.taxable,
                taxCategory: l.taxCategory,
                memo: l.memo,
                lineType: l.lineType === "fixed" ? "variable" : l.lineType,
                sortOrder: l.sortOrder,
              })),
            });
          }
        }
      }
    }

    return NextResponse.json({ payslipId: payslip.id, periodId: period.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
