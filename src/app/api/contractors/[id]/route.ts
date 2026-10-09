import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    if (body.name !== undefined && !String(body.name).trim()) {
      return NextResponse.json({ error: "会社名を入力してください" }, { status: 400 });
    }

    const contractor = await prisma.contractor.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        email: body.email !== undefined ? String(body.email).trim() || null : undefined,
      },
    });

    return NextResponse.json(contractor);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "その会社名はすでに登録されています" }, { status: 409 });
    }
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.contractor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
