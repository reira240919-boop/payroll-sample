import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { generatePayslipPdf } from "@/lib/payslip-pdf";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const payslip = await prisma.payslip.findUnique({
      where: { id },
      select: { employeeId: true, status: true },
    });

    if (!payslip) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    if (session.role !== "admin" && payslip.employeeId !== session.employeeId) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    if (session.role === "employee" && payslip.status !== "approved") {
      return NextResponse.json({ error: "確定前の明細はダウンロードできません" }, { status: 403 });
    }

    const result = await generatePayslipPdf(id);
    if (!result) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    const filename = encodeURIComponent(result.filename);

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "PDF生成に失敗しました" }, { status: 500 });
  }
}
