import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const type = request.nextUrl.searchParams.get("type");
    const options = await prisma.payrollOption.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const type = String(body.type || "").trim();
    const name = String(body.name || "").trim();

    if (!type || !name) {
      return NextResponse.json({ error: "項目名を入力してください" }, { status: 400 });
    }

    const maxSort = await prisma.payrollOption.aggregate({
      where: { type },
      _max: { sortOrder: true },
    });

    const option = await prisma.payrollOption.create({
      data: { type, name, sortOrder: (maxSort._max.sortOrder ?? -1) + 1 },
    });

    return NextResponse.json(option, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "すでに登録されています" }, { status: 409 });
    }
    return NextResponse.json({ error: "追加に失敗しました" }, { status: 500 });
  }
}
