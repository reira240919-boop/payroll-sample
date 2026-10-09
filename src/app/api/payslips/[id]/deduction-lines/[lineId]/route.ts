import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { allocateAdvanceRepayment, reverseAdvanceRepayments } from "@/lib/payroll";

type Params = { params: Promise<{ id: string; lineId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id: payslipId, lineId } = await params;
    const body = await request.json();

    let amount = body.amount !== undefined ? Number(body.amount) : undefined;

    if (body.lineType === "advance" && amount !== undefined) {
      const payslip = await prisma.payslip.findUniqueOrThrow({ where: { id: payslipId } });
      await reverseAdvanceRepayments(payslipId);
      amount = await allocateAdvanceRepayment(payslip.employeeId, payslipId, amount);
    }

    const line = await prisma.payslipDeductionLine.update({
      where: { id: lineId, payslipId },
      data: {
        itemName: body.itemName,
        quantity:
          body.quantity !== undefined
            ? body.quantity === "" || body.quantity === null
              ? null
              : Number(body.quantity)
            : undefined,
        amount,
        taxable: body.taxable !== undefined ? Boolean(body.taxable) : undefined,
        taxCategory: body.taxCategory !== undefined ? body.taxCategory || null : undefined,
        memo: body.memo,
        lineType: body.lineType,
      },
    });

    return NextResponse.json(line);
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
    const { id: payslipId, lineId } = await params;

    const line = await prisma.payslipDeductionLine.findUnique({ where: { id: lineId } });
    if (line?.lineType === "advance") {
      await reverseAdvanceRepayments(payslipId);
    }

    await prisma.payslipDeductionLine.delete({
      where: { id: lineId, payslipId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
