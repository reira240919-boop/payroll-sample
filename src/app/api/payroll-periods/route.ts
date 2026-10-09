import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  try {
    await requireAdmin();
    const periods = await prisma.payrollPeriod.findMany({
      include: {
        _count: { select: { payslips: true } },
        payslips: {
          select: { status: true },
        },
      },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(periods);
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

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    const existing = await prisma.payrollPeriod.findFirst({
      where: { startDate, endDate },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const period = await prisma.payrollPeriod.create({
      data: { startDate, endDate },
    });

    return NextResponse.json(period, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
