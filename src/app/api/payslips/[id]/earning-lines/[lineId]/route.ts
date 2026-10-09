import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { calcEarningAmount } from "@/lib/payroll";

type Params = { params: Promise<{ id: string; lineId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id: payslipId, lineId } = await params;
    const body = await request.json();

    const hours = body.hours !== undefined ? Number(body.hours) : undefined;
    const rate = body.rate !== undefined ? Number(body.rate) : undefined;

    let amount = body.amount !== undefined ? Number(body.amount) : undefined;
    if (amount === undefined && hours !== undefined && rate !== undefined) {
      amount = calcEarningAmount(hours, rate);
    }

    const line = await prisma.payslipEarningLine.update({
      where: { id: lineId, payslipId },
      data: {
        siteName: body.siteName,
        contractorName: body.contractorName !== undefined ? body.contractorName || null : undefined,
        workType: body.workType,
        hours,
        quantityUnit: body.quantityUnit,
        rate,
        amount,
        taxable: body.taxable !== undefined ? Boolean(body.taxable) : undefined,
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

    await prisma.payslipEarningLine.delete({
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
