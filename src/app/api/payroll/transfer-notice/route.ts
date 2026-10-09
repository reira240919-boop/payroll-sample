import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { sendTransferNoticeIfComplete } from "@/lib/transfer-notice";

// 振込の人が全員チェック済みなら、社長に振込完了メールを送る（自動送信の失敗時の再送にも使う）
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const periodId = String(body.periodId || "");
    const payday = String(body.payday || "");
    if (!periodId || !payday) {
      return NextResponse.json({ error: "対象が指定されていません" }, { status: 400 });
    }

    const result = await sendTransferNoticeIfComplete(periodId, payday);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
  }
}
