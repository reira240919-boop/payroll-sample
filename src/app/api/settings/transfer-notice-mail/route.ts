import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { setTransferNoticeMailTemplate } from "@/lib/settings";

// 社長への振込完了メールの件名・本文を保存する
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const subject = String(body.subject || "").trim();
    const text = String(body.body || "");

    if (!subject) {
      return NextResponse.json({ error: "件名を入力してください" }, { status: 400 });
    }

    await setTransferNoticeMailTemplate({ subject, body: text });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
