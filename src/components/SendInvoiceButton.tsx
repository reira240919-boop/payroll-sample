"use client";

import { useState } from "react";

export default function SendInvoiceButton({
  invoiceId,
  defaultEmail,
  defaultSubject,
  defaultBody,
}: {
  invoiceId: string;
  defaultEmail: string | null;
  defaultSubject: string;
  defaultBody: string;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultEmail || "");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setSending(true);
    setError("");
    const res = await fetch(`/api/invoices/${invoiceId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(data.error || "送信に失敗しました");
      return;
    }
    setSent(true);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
      >
        メールで送信
      </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-3 text-sm shadow-sm">
      {sent ? (
        <div className="flex items-center gap-3">
          <span className="text-green-700">送信しました</span>
          <button
            onClick={() => {
              setOpen(false);
              setSent(false);
            }}
            className="text-xs text-slate-500 hover:underline"
          >
            閉じる
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">送信先メールアドレス</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="送信先メールアドレス"
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
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
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSend}
              disabled={sending || !to}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? "送信中..." : "送信する"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-slate-500 hover:underline"
            >
              キャンセル
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
