"use client";

import { useState } from "react";
import Link from "next/link";

export default function TransferNoticeMailSetting({
  initialSubject,
  initialBody,
}: {
  initialSubject: string;
  initialBody: string;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSave() {
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch("/api/settings/transfer-notice-mail", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setIsError(true);
        setMessage(data.error || "更新に失敗しました");
        return;
      }
      setMessage("保存しました");
    } catch {
      setIsError(true);
      setMessage("サーバーに接続できませんでした。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="font-semibold">社長への振込完了メール</h3>
      <p className="mt-1 text-sm text-slate-600">
        振込日ごとの画面で、振込の人が全員チェック済みになった時に自動で送るメールの件名・本文です。
        {"{会社名}"}・{"{期間}"}・{"{振込日}"} と書くと、送信時にそれぞれ自動で置き換わります（例：{"{期間}"}→2026年9月、{"{振込日}"}→25日振込分）。
      </p>
      <p className="mt-1 text-xs text-slate-500">
        送信先は、
        <Link href="/admin/approvals/settings" className="text-blue-600 underline">
          承認・確定の設定
        </Link>
        の「社長のメールアドレス」です。
      </p>
      <div className="mt-3 grid gap-3">
        <div>
          <label className="text-sm font-medium">件名</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="【{会社名}】{期間}分 給与の振込が完了しました"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium">本文</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存"}
        </button>
        {message && (
          <span
            className={`rounded-lg px-3 py-2 text-sm ${
              isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
