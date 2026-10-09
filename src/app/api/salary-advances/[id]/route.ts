import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const advance = await prisma.salaryAdvance.findUnique({ where: { id } });
    if (!advance) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    const data: { loanDate?: Date; loanAmount?: number; balance?: number; memo?: string | null } = {};

    if (body.loanDate !== undefined) data.loanDate = new Date(body.loanDate);
    if (body.memo !== undefined) data.memo = body.memo || null;
    if (body.loanAmount !== undefined) {
      const newLoanAmount = Number(body.loanAmount) || 0;
      const alreadyRepaid = advance.loanAmount - advance.balance;
      if (newLoanAmount < alreadyRepaid) {
        return NextResponse.json(
          { error: `すでに¥${alreadyRepaid.toLocaleString()}返済済みのため、それ以下には変更できません` },
          { status: 400 }
        );
      }
      data.loanAmount = newLoanAmount;
      data.balance = newLoanAmount - alreadyRepaid;
    }

    const updated = await prisma.salaryAdvance.update({ where: { id }, data });
    return NextResponse.json(updated);
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

    const advance = await prisma.salaryAdvance.findUnique({
      where: { id },
      include: { _count: { select: { repayments: true } } },
    });
    if (!advance) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }
    if (advance._count.repayments > 0) {
      return NextResponse.json(
        { error: "すでに返済記録があるため削除できません。金額の修正のみ行えます" },
        { status: 400 }
      );
    }

    await prisma.salaryAdvance.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
