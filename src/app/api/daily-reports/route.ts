import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const contractorName = searchParams.get("contractorName");

    const where: Record<string, unknown> = {};

    if (session.role === "admin" && employeeId) {
      where.employeeId = employeeId;
    } else if (session.role === "employee") {
      where.employeeId = session.employeeId;
    }

    if (status) where.status = status;
    if (contractorName) where.contractorName = contractorName;
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, Date>).gte = new Date(from);
      if (to) (where.date as Record<string, Date>).lte = new Date(to);
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      include: { employee: { select: { id: true, name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(reports);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { date, siteName, contractorName, workHours, overtimeHours, status, employeeId } = body;

    const targetEmployeeId =
      session.role === "admin" && employeeId ? employeeId : session.employeeId;

    const report = await prisma.dailyReport.create({
      data: {
        employeeId: targetEmployeeId,
        date: new Date(date),
        siteName,
        contractorName: contractorName || null,
        workHours: Number(workHours) || 0,
        overtimeHours: Number(overtimeHours) || 0,
        status: status || "draft",
      },
      include: { employee: { select: { id: true, name: true } } },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
