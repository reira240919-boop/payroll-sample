import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getCompanyInfo, setCompanyInfo, type CompanyInfo } from "@/lib/settings";

// PDF generation only supports these formats; anything else saves fine but
// breaks every payslip/invoice PDF the next time one is generated.
const ALLOWED_IMAGE_DATA_URL = /^data:image\/(png|jpeg|svg\+xml);base64,/;

function isValidImageDataUrl(value: string): boolean {
  return value === "" || ALLOWED_IMAGE_DATA_URL.test(value);
}

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getCompanyInfo());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const logoDataUrl = String(body.logoDataUrl || "");
    const sealDataUrl = String(body.sealDataUrl || "");

    if (!isValidImageDataUrl(logoDataUrl) || !isValidImageDataUrl(sealDataUrl)) {
      return NextResponse.json(
        { error: "ロゴ・社印はPNG・JPEG・SVG形式の画像を選んでください" },
        { status: 400 }
      );
    }

    const info: CompanyInfo = {
      name: String(body.name || ""),
      postalCode: String(body.postalCode || ""),
      address: String(body.address || ""),
      phone: String(body.phone || ""),
      fax: String(body.fax || ""),
      bankName: String(body.bankName || ""),
      bankBranch: String(body.bankBranch || ""),
      bankAccountType: String(body.bankAccountType || ""),
      bankAccountNumber: String(body.bankAccountNumber || ""),
      bankAccountHolder: String(body.bankAccountHolder || ""),
      invoiceRegistrationNumber: String(body.invoiceRegistrationNumber || ""),
      invoiceMailSubject: String(body.invoiceMailSubject || ""),
      invoiceMailBody: String(body.invoiceMailBody || ""),
      taxAccountantEmail: String(body.taxAccountantEmail || ""),
      logoDataUrl,
      sealDataUrl,
    };

    await setCompanyInfo(info);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
