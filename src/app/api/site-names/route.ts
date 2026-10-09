import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function GET() {
  try {
    await requireAuth();

    const reports = await prisma.dailyReport.findMany({
      distinct: ["siteName"],
      orderBy: { date: "desc" },
      select: { siteName: true },
      take: 200,
    });

    return NextResponse.json(reports.map((r) => r.siteName));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
