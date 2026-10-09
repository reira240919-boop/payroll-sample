import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { generatePayslipPdf } from "@/lib/payslip-pdf";
import { sendMail } from "@/lib/mail";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const payslipIds: string[] = Array.isArray(body.payslipIds) ? body.payslipIds : [];
    const to = String(body.to || "").trim();
    const subject = String(body.subject || "").trim();
    const text = String(body.body || "").trim();

    if (payslipIds.length === 0) {
      return NextResponse.json({ error: "送信対象の明細がありません" }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ error: "送信先メールアドレスを入力してください" }, { status: 400 });
    }

    const payslips = await prisma.payslip.findMany({
      where: { id: { in: payslipIds } },
      select: { id: true, status: true },
    });
    if (payslips.some((p) => p.status !== "approved")) {
      return NextResponse.json(
        { error: "確定済みの明細のみ送信できます" },
        { status: 400 }
      );
    }

    const attachments = [];
    for (const id of payslipIds) {
      const result = await generatePayslipPdf(id);
      if (result) {
        attachments.push({ filename: result.filename, content: result.buffer });
      }
    }

    await sendMail({ to, subject, text, attachments });

    return NextResponse.json({ ok: true, count: attachments.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
