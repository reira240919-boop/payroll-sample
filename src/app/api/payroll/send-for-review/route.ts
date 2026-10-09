import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { generatePayslipPdf } from "@/lib/payslip-pdf";
import { sendMail } from "@/lib/mail";
import { getPresidentEmail } from "@/lib/settings";

// 承認待ちの明細をPDFで添付し、社長に確認メールを送る
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const payslipIds: string[] = Array.isArray(body.payslipIds) ? body.payslipIds : [];
    const subject = String(body.subject || "").trim();
    const text = String(body.body || "").trim();

    if (payslipIds.length === 0) {
      return NextResponse.json({ error: "送信する明細を選択してください" }, { status: 400 });
    }

    const to = await getPresidentEmail();
    if (!to) {
      return NextResponse.json(
        { error: "社長のメールアドレスが未登録です（承認・確定の「設定」から登録できます）" },
        { status: 400 }
      );
    }

    const payslips = await prisma.payslip.findMany({
      where: { id: { in: payslipIds } },
      select: { id: true, status: true },
    });
    if (payslips.some((p) => p.status !== "draft")) {
      return NextResponse.json({ error: "承認待ちの明細のみ送信できます" }, { status: 400 });
    }

    const attachments = [];
    for (const id of payslipIds) {
      const result = await generatePayslipPdf(id);
      if (result) {
        attachments.push({ filename: result.filename, content: result.buffer });
      }
    }

    await sendMail({ to, subject, text, attachments });

    const sentAt = new Date();
    await prisma.payslip.updateMany({
      where: { id: { in: payslipIds } },
      data: { reviewRequestedAt: sentAt },
    });

    return NextResponse.json({ ok: true, count: attachments.length, to });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
