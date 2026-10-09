import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

type Params = { params: Promise<{ id: string; repaymentId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id, repaymentId } = await params;

    const repayment = await prisma.advanceRepayment.findUnique({ where: { id: repaymentId } });
    if (!repayment || repayment.salaryAdvanceId !== id) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    if (repayment.payslipId) {
      return NextResponse.json(
        { error: "給与明細から記録された返済は明細側で修正してください" },
        { status: 400 }
      );
    }

    const advance = await prisma.salaryAdvance.findUniqueOrThrow({ where: { id } });

    await prisma.$transaction([
      prisma.advanceRepayment.delete({ where: { id: repaymentId } }),
      prisma.salaryAdvance.update({
        where: { id },
        data: { balance: advance.balance + repayment.amount },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "取消に失敗しました" }, { status: 500 });
  }
}
