import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  try {
    await requireAdmin();
    const advances = await prisma.salaryAdvance.findMany({
      include: {
        employee: { select: { id: true, name: true } },
        repayments: {
          include: { payslip: { include: { payrollPeriod: true } } },
          orderBy: { repaidAt: "desc" },
        },
      },
      orderBy: { loanDate: "desc" },
    });
    return NextResponse.json(advances);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const loanAmount = Number(body.loanAmount) || 0;

    const advance = await prisma.salaryAdvance.create({
      data: {
        employeeId: body.employeeId,
        loanDate: new Date(body.loanDate),
        loanAmount,
        balance: loanAmount,
        memo: body.memo || null,
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    return NextResponse.json(advance, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
