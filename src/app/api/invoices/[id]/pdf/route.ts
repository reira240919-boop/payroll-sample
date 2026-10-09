import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const result = await generateInvoicePdf(id);
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
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "PDF生成に失敗しました" }, { status: 500 });
  }
}
