import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { calcEarningAmount } from "@/lib/payroll";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id: payslipId } = await params;
    const body = await request.json();

    const hours = Number(body.hours) || 0;
    const rate = Number(body.rate) || 0;
    const amount = body.amount !== undefined ? Number(body.amount) : calcEarningAmount(hours, rate);

    const maxSort = await prisma.payslipEarningLine.aggregate({
      where: { payslipId },
      _max: { sortOrder: true },
    });

    const line = await prisma.payslipEarningLine.create({
      data: {
        payslipId,
        siteName: body.siteName || "",
        contractorName: body.contractorName || null,
        workType: body.workType || null,
        hours,
        quantityUnit: body.quantityUnit || "時間",
        rate,
        amount,
        taxable: body.taxable !== undefined ? Boolean(body.taxable) : true,
        memo: body.memo || null,
        lineType: body.lineType || "manual",
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
