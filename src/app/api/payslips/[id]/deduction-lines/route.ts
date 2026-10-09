import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { allocateAdvanceRepayment } from "@/lib/payroll";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id: payslipId } = await params;
    const body = await request.json();

    const maxSort = await prisma.payslipDeductionLine.aggregate({
      where: { payslipId },
      _max: { sortOrder: true },
    });

    let amount = Number(body.amount) || 0;

    if (body.lineType === "advance") {
      const payslip = await prisma.payslip.findUniqueOrThrow({ where: { id: payslipId } });
      amount = await allocateAdvanceRepayment(payslip.employeeId, payslipId, amount);
    }

    const line = await prisma.payslipDeductionLine.create({
      data: {
        payslipId,
        itemName: body.itemName || "",
        quantity: body.quantity !== undefined && body.quantity !== "" ? Number(body.quantity) : null,
        amount,
        taxable: body.taxable !== undefined ? Boolean(body.taxable) : true,
        taxCategory: body.taxCategory || null,
        memo: body.memo || null,
        lineType: body.lineType || "variable",
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(line, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "追加に失敗しました" }, { status: 500 });
  }
}
