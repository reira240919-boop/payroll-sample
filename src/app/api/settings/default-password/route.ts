import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getDefaultPassword, setDefaultPassword } from "@/lib/settings";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ value: await getDefaultPassword() });
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
    const { value } = await request.json();

    if (!value || String(value).length < 6) {
      return NextResponse.json({ error: "6文字以上で入力してください" }, { status: 400 });
    }

    await setDefaultPassword(String(value));
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
