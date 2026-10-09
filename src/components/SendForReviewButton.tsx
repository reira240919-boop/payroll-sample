"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 承認待ちで選択した明細をPDFで添付し、社長に確認メールを送る
export default function SendForReviewButton({
  payslipIds,
  presidentEmail,
  defaultSubject,
  defaultBody,
}: {
  payslipIds: string[];
  presidentEmail: string;
  defaultSubject: string;
  defaultBody: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");

  async function handleSend() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/payroll/send-for-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payslipIds, subject, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "送信に失敗しました");
        return;
      }
      setOpen(false);
      setSentMessage(`社長に${data.count}件の明細を送信しました`);
      router.refresh();
    } catch {
      setError("サーバーに接続できませんでした。");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setOpen(true);
            setSentMessage("");
            setSubject(defaultSubject);
            setBody(defaultBody);
          }}
          disabled={payslipIds.length === 0}
          className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          選択した明細を社長に確認メール ({payslipIds.length})
        </button>
        {sentMessage && (
          <span className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{sentMessage}</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-sm">
      <div className="space-y-2">
        <p className="text-xs text-slate-500">
          選択した承認待ちの明細 {payslipIds.length}件をPDFで添付して、社長に送信します。
        </p>
        <div>
          <label className="mb-1 block text-xs text-slate-500">送信先（社長）</label>
          {presidentEmail ? (
            <p className="rounded border bg-slate-50 px-2 py-1.5">{presidentEmail}</p>
          ) : (
            <p className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-red-700">
              未登録です。
              <Link href="/admin/approvals/settings" className="underline">
                設定
              </Link>
              から登録してください。
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">件名</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">本文</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleSend}
            disabled={sending || !presidentEmail || payslipIds.length === 0}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "送信中..." : "送信する"}
          </button>
          <button onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:underline">
            キャンセル
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  );
}
