import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id: invoiceId } = await params;
    const body = await request.json();

    const maxSort = await prisma.invoiceLine.aggregate({
      where: { invoiceId },
      _max: { sortOrder: true },
    });

    const line = await prisma.invoiceLine.create({
      data: {
        invoiceId,
        section: body.section || "charge",
        groupLabel: body.groupLabel || null,
        content: body.content || "",
        quantity: body.quantity !== undefined && body.quantity !== "" ? Number(body.quantity) : null,
        unit: body.unit || null,
        unitPrice: body.unitPrice !== undefined && body.unitPrice !== "" ? Number(body.unitPrice) : null,
        amount: Number(body.amount) || 0,
        taxCategory: body.taxCategory || null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(line, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "追加に失敗しました" }, { status: 500 });
  }
}
