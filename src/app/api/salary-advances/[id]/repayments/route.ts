import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const advance = await prisma.salaryAdvance.findUnique({ where: { id } });
    if (!advance) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    const amount = Number(body.amount) || 0;
    if (amount <= 0) {
      return NextResponse.json({ error: "返済額を入力してください" }, { status: 400 });
    }
    if (amount > advance.balance) {
      return NextResponse.json(
        { error: `残高（¥${advance.balance.toLocaleString()}）を超える金額は入力できません` },
        { status: 400 }
      );
    }

    const repaidAt = body.repaidAt ? new Date(body.repaidAt) : new Date();

    const [repayment] = await prisma.$transaction([
      prisma.advanceRepayment.create({
        data: {
          salaryAdvanceId: id,
          amount,
          repaidAt,
          memo: body.memo || null,
        },
      }),
      prisma.salaryAdvance.update({
        where: { id },
        data: { balance: advance.balance - amount },
      }),
    ]);

    return NextResponse.json(repayment, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "記録に失敗しました" }, { status: 500 });
  }
}
