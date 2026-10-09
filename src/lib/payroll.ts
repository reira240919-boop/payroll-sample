import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth, addMonths, setDate } from "date-fns";

export function getEmployeePeriodRange(
  closingDay: number | null | undefined,
  period: { startDate: Date; endDate: Date }
) {
  if (!closingDay) {
    return { start: period.startDate, end: period.endDate };
  }
  const end = setDate(period.startDate, closingDay);
  const start = setDate(addMonths(period.startDate, -1), closingDay + 1);
  return { start, end };
}

export function calcEarningAmount(hours: number, rate: number) {
  return Math.round(hours * rate);
}

export function calcOvertimeAmount(hours: number, rate: number, multiplier: number) {
  return Math.round(hours * rate * multiplier);
}

export async function generateEarningLinesFromReports(
  payslipId: string,
  employeeId: string,
  startDate: Date,
  endDate: Date
) {
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: employeeId },
  });

  const reports = await prisma.dailyReport.findMany({
    where: {
      employeeId,
      date: { gte: startDate, lte: endDate },
      status: { in: ["submitted", "approved"] },
    },
    orderBy: [{ date: "asc" }, { siteName: "asc" }],
  });

  // 元請けごとにまとめる（現場名は任意なので、元請けの中でさらに分けるだけ）
  const groups = new Map<
    string,
    { contractorName: string | null; siteName: string; workHours: number; overtimeHours: number }
  >();

  for (const report of reports) {
    const contractorName = report.contractorName || null;
    const key = JSON.stringify([contractorName, report.siteName]);
    const existing = groups.get(key) || {
      contractorName,
      siteName: report.siteName,
      workHours: 0,
      overtimeHours: 0,
    };
    existing.workHours += report.workHours;
    existing.overtimeHours += report.overtimeHours;
    groups.set(key, existing);
  }

  // 同じ元請けの行が並ぶように、元請けが初めて出てきた順に並べる
  const contractorOrder = [...new Set([...groups.values()].map((g) => g.contractorName))];
  const sortedGroups = [...groups.values()].sort(
    (a, b) => contractorOrder.indexOf(a.contractorName) - contractorOrder.indexOf(b.contractorName)
  );

  await prisma.payslipEarningLine.deleteMany({
    where: { payslipId, lineType: "auto" },
  });

  let sortOrder = 0;
  for (const { siteName, contractorName, ...hours } of sortedGroups) {
    if (hours.workHours > 0) {
      await prisma.payslipEarningLine.create({
        data: {
          payslipId,
          siteName,
          contractorName,
          hours: hours.workHours,
          rate: employee.hourlyRate,
          amount: calcEarningAmount(hours.workHours, employee.hourlyRate),
          lineType: "auto",
          sortOrder: sortOrder++,
        },
      });
    }
    if (hours.overtimeHours > 0) {
      const otRate = employee.hourlyRate * employee.overtimeMultiplier;
      await prisma.payslipEarningLine.create({
        data: {
          payslipId,
          siteName: `${siteName}（残業）`,
          contractorName,
          hours: hours.overtimeHours,
          rate: otRate,
          amount: calcOvertimeAmount(
            hours.overtimeHours,
            employee.hourlyRate,
            employee.overtimeMultiplier
          ),
          lineType: "auto",
          sortOrder: sortOrder++,
        },
      });
    }
  }
}

export async function applyFixedDeductions(payslipId: string, employeeId: string) {
  const templates = await prisma.fixedDeductionTemplate.findMany({
    where: { employeeId },
    orderBy: { sortOrder: "asc" },
  });

  await prisma.payslipDeductionLine.deleteMany({
    where: { payslipId, lineType: "fixed" },
  });

  for (const template of templates) {
    if (template.amount > 0) {
      await prisma.payslipDeductionLine.create({
        data: {
          payslipId,
          itemName: template.itemName,
          amount: template.amount,
          lineType: "fixed",
          sortOrder: template.sortOrder,
        },
      });
    }
  }
}

export async function applyFixedAllowances(payslipId: string, employeeId: string) {
  const templates = await prisma.fixedAllowanceTemplate.findMany({
    where: { employeeId },
    orderBy: { sortOrder: "asc" },
  });

  await prisma.payslipEarningLine.deleteMany({
    where: { payslipId, lineType: "fixed_allowance" },
  });

  const maxSort = await prisma.payslipEarningLine.aggregate({
    where: { payslipId },
    _max: { sortOrder: true },
  });
  let sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  for (const template of templates) {
    if (template.amount > 0) {
      await prisma.payslipEarningLine.create({
        data: {
          payslipId,
          siteName: template.itemName,
          hours: 0,
          rate: 0,
          amount: template.amount,
          taxable: template.taxable,
          lineType: "fixed_allowance",
          sortOrder: sortOrder++,
        },
      });
    }
  }
}

export async function recalcPayslipTotals(payslipId: string) {
  const payslip = await prisma.payslip.findUniqueOrThrow({
    where: { id: payslipId },
    include: {
      earningLines: true,
      deductionLines: true,
    },
  });

  const totalEarnings = payslip.earningLines.reduce((s, l) => s + l.amount, 0);
  const totalDeductions = payslip.deductionLines.reduce((s, l) => s + l.amount, 0);
  const netPay = totalEarnings - totalDeductions;

  return { totalEarnings, totalDeductions, netPay };
}

export async function getOrCreatePayslip(employeeId: string, payrollPeriodId: string) {
  let payslip = await prisma.payslip.findUnique({
    where: {
      employeeId_payrollPeriodId: { employeeId, payrollPeriodId },
    },
  });

  if (!payslip) {
    payslip = await prisma.payslip.create({
      data: { employeeId, payrollPeriodId },
    });
  }

  return payslip;
}

export async function getOrCreateCurrentPeriod(startDate?: Date, endDate?: Date) {
  const start = startDate ?? startOfMonth(new Date());
  const end = endDate ?? endOfMonth(new Date());

  let period = await prisma.payrollPeriod.findFirst({
    where: { startDate: start, endDate: end },
  });

  if (!period) {
    period = await prisma.payrollPeriod.create({
      data: { startDate: start, endDate: end },
    });
  }

  return period;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
}

export async function allocateAdvanceRepayment(
  employeeId: string,
  payslipId: string,
  amount: number
) {
  const advances = await prisma.salaryAdvance.findMany({
    where: { employeeId, balance: { gt: 0 } },
    orderBy: { loanDate: "asc" },
  });

  let remaining = amount;
  let allocated = 0;

  for (const advance of advances) {
    if (remaining <= 0) break;
    const pay = Math.min(remaining, advance.balance);
    if (pay <= 0) continue;

    await prisma.advanceRepayment.create({
      data: { salaryAdvanceId: advance.id, payslipId, amount: pay },
    });
    await prisma.salaryAdvance.update({
      where: { id: advance.id },
      data: { balance: advance.balance - pay },
    });

    remaining -= pay;
    allocated += pay;
  }

  return allocated;
}

export async function reverseAdvanceRepayments(payslipId: string) {
  const repayments = await prisma.advanceRepayment.findMany({ where: { payslipId } });

  for (const repayment of repayments) {
    await prisma.salaryAdvance.update({
      where: { id: repayment.salaryAdvanceId },
      data: { balance: { increment: repayment.amount } },
    });
  }

  await prisma.advanceRepayment.deleteMany({ where: { payslipId } });
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
