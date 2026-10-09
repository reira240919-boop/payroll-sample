"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function formatSentAt(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 振込の人が全員チェック済みになった後の、社長への振込完了メールの状態
export default function TransferNoticeStatus({
  periodId,
  payday,
  sentAt,
  hasPresidentEmail,
}: {
  periodId: string;
  payday: string;
  sentAt: string | null;
  hasPresidentEmail: boolean;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/payroll/transfer-notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, payday }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status === "failed") {
        setError(data.error || "送信に失敗しました。時間をおいてもう一度お試しください。");
        return;
      }
      if (data.status === "no_email") {
        setError("社長のメールアドレスが未登録です");
        return;
      }
      router.refresh();
    } catch {
      setError("サーバーに接続できませんでした。");
    } finally {
      setSending(false);
    }
  }

  if (sentAt) {
    return (
      <div className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">
        社長に振込完了メールを送りました（{formatSentAt(sentAt)}）
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
      <p>振込は全員完了していますが、社長への振込完了メールはまだ送られていません。</p>
      {hasPresidentEmail ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={handleSend}
            disabled={sending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "送信中..." : "社長に振込完了メールを送る"}
          </button>
          {error && <span className="text-red-600">{error}</span>}
        </div>
      ) : (
        <p className="mt-2">
          社長のメールアドレスが未登録です。
          <Link href="/admin/approvals/settings" className="underline">
            承認・確定の設定
          </Link>
          から登録すると送れるようになります。
        </p>
      )}
    </div>
  );
}
