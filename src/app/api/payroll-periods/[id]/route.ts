import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  applyFixedAllowances,
  applyFixedDeductions,
  generateEarningLinesFromReports,
  getEmployeePeriodRange,
  getOrCreatePayslip,
} from "@/lib/payroll";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const period = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        payslips: {
          include: {
            employee: { select: { id: true, name: true, hourlyRate: true } },
            earningLines: true,
            deductionLines: true,
          },
        },
      },
    });

    if (!period) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    return NextResponse.json(period);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const period = await prisma.payrollPeriod.update({
      where: { id },
      data: {
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        status: body.status,
      },
    });

    return NextResponse.json(period);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const period = await prisma.payrollPeriod.findUniqueOrThrow({ where: { id } });

    const employees = await prisma.employee.findMany({
      where: { role: "employee", active: true },
    });

    const targetIds = body.employeeIds?.length
      ? body.employeeIds
      : employees.map((e) => e.id);

    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    for (const employeeId of targetIds) {
      const payslip = await getOrCreatePayslip(employeeId, id);
      const range = getEmployeePeriodRange(employeeMap.get(employeeId)?.closingDay, period);
      await generateEarningLinesFromReports(payslip.id, employeeId, range.start, range.end);
      await applyFixedDeductions(payslip.id, employeeId);
      await applyFixedAllowances(payslip.id, employeeId);
    }

    const updated = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        payslips: {
          include: {
            employee: { select: { id: true, name: true } },
            earningLines: true,
            deductionLines: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "生成に失敗しました" }, { status: 500 });
  }
}
