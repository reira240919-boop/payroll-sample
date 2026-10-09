import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { payslipIds } = body;

    if (!Array.isArray(payslipIds) || payslipIds.length === 0) {
      return NextResponse.json({ error: "対象を選択してください" }, { status: 400 });
    }

    const result = await prisma.payslip.updateMany({
      where: { id: { in: payslipIds } },
      data: { status: "approved", approvedAt: new Date() },
    });

    return NextResponse.json({ count: result.count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "承認に失敗しました" }, { status: 500 });
  }
}
