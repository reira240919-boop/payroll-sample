import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/session";
import { recalcPayslipTotals, reverseAdvanceRepayments } from "@/lib/payroll";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true, hourlyRate: true } },
        payrollPeriod: true,
        earningLines: { orderBy: { sortOrder: "asc" } },
        deductionLines: { orderBy: { sortOrder: "asc" } },
        advanceRepayments: {
          include: { salaryAdvance: true },
        },
      },
    });

    if (!payslip) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    if (session.role !== "admin" && payslip.employeeId !== session.employeeId) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    if (session.role === "employee" && payslip.status !== "approved") {
      return NextResponse.json({ error: "確定前の明細は閲覧できません" }, { status: 403 });
    }

    const totals = await recalcPayslipTotals(id);
    return NextResponse.json({ ...payslip, ...totals });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const payslip = await prisma.payslip.update({
      where: { id },
      data: {
        status: body.status,
        approvedAt: body.status === "approved" ? new Date() : body.status === "draft" ? null : undefined,
        transferConfirmed: body.transferConfirmed !== undefined ? Boolean(body.transferConfirmed) : undefined,
      },
    });

    return NextResponse.json(payslip);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Restore any 前払い balance this payslip's deduction lines had reduced —
    // otherwise deleting it would leave the ledger permanently short (the
    // AdvanceRepayment rows themselves survive the cascade with payslipId
    // set to null instead of being removed).
    await reverseAdvanceRepayments(id);
    await prisma.payslip.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
