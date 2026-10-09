import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

type Params = { params: Promise<{ id: string; lineId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id: invoiceId, lineId } = await params;
    const body = await request.json();

    const line = await prisma.invoiceLine.update({
      where: { id: lineId, invoiceId },
      data: {
        section: body.section,
        groupLabel: body.groupLabel !== undefined ? body.groupLabel || null : undefined,
        content: body.content,
        quantity:
          body.quantity !== undefined ? (body.quantity === "" ? null : Number(body.quantity)) : undefined,
        unit: body.unit !== undefined ? body.unit || null : undefined,
        unitPrice:
          body.unitPrice !== undefined
            ? body.unitPrice === ""
              ? null
              : Number(body.unitPrice)
            : undefined,
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        taxCategory: body.taxCategory !== undefined ? body.taxCategory || null : undefined,
      },
    });

    return NextResponse.json(line);
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
    const { id: invoiceId, lineId } = await params;
    await prisma.invoiceLine.delete({ where: { id: lineId, invoiceId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
