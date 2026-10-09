import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { sendMail } from "@/lib/mail";
import { fillInvoiceMailTemplate } from "@/lib/settings";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const to = String(body.to || "").trim();

    if (!to) {
      return NextResponse.json({ error: "送信先メールアドレスを入力してください" }, { status: 400 });
    }

    const result = await generateInvoicePdf(id);
    if (!result) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    let subject = String(body.subject || "").trim();
    let text = String(body.body || "").trim();

    if (!subject || !text) {
      const mailVars = {
        会社名: result.companyName,
        契約者名: result.contractorName,
        期間: result.periodLabel,
      };
      if (!subject) subject = fillInvoiceMailTemplate(result.invoiceMailSubject, mailVars);
      if (!text) text = fillInvoiceMailTemplate(result.invoiceMailBody, mailVars);
    }

    await sendMail({
      to,
      subject,
      text,
      attachments: [{ filename: result.filename, content: result.buffer }],
    });

    await prisma.invoice.update({ where: { id }, data: { emailSentAt: new Date() } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
