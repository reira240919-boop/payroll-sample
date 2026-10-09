import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get("contractorId");

    const invoices = await prisma.invoice.findMany({
      where: contractorId ? { contractorId } : undefined,
      include: { lines: true, contractor: { select: { id: true, name: true } } },
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json(invoices);
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
    const { contractorId, issueDate, periodLabel, copyFromInvoiceId } = body;

    if (!contractorId || !issueDate || !periodLabel) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    let copySourceLines: {
      section: string;
      groupLabel: string | null;
      content: string;
      quantity: number | null;
      unit: string | null;
      unitPrice: number | null;
      amount: number;
      taxCategory: string | null;
      sortOrder: number;
    }[] = [];

    if (copyFromInvoiceId) {
      const source = await prisma.invoice.findUnique({
        where: { id: copyFromInvoiceId },
        include: { lines: { orderBy: { sortOrder: "asc" } } },
      });
      if (source) copySourceLines = source.lines;
    }

    const invoice = await prisma.invoice.create({
      data: {
        contractorId,
        issueDate: new Date(issueDate),
        periodLabel,
        lines: {
          create: copySourceLines.map((l) => ({
            section: l.section,
            groupLabel: l.groupLabel,
            content: l.content,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unitPrice,
            amount: l.amount,
            taxCategory: l.taxCategory,
            sortOrder: l.sortOrder,
          })),
        },
      },
      include: { lines: true },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
