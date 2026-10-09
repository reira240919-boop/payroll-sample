import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const report = await prisma.dailyReport.findUnique({
      where: { id },
      include: { employee: { select: { id: true, name: true } } },
    });

    if (!report) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    if (session.role !== "admin" && report.employeeId !== session.employeeId) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.dailyReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    if (session.role !== "admin" && existing.employeeId !== session.employeeId) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const report = await prisma.dailyReport.update({
      where: { id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        siteName: body.siteName,
        contractorName: body.contractorName !== undefined ? body.contractorName || null : undefined,
        workHours: body.workHours !== undefined ? Number(body.workHours) : undefined,
        overtimeHours: body.overtimeHours !== undefined ? Number(body.overtimeHours) : undefined,
        status: body.status,
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existing = await prisma.dailyReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    if (session.role !== "admin" && existing.employeeId !== session.employeeId) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    await prisma.dailyReport.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
