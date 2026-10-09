import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (session.role === "admin" && employeeId) {
      where.employeeId = employeeId;
    } else if (session.role === "employee") {
      where.employeeId = session.employeeId;
      where.status = "approved";
    }

    if (status && session.role === "admin") {
      where.status = status;
    }

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true } },
        payrollPeriod: true,
        earningLines: { orderBy: { sortOrder: "asc" } },
        deductionLines: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payslips);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
