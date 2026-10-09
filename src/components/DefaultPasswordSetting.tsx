"use client";

import { useState } from "react";

export default function DefaultPasswordSetting({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSave() {
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch("/api/settings/default-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
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
    <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
      <h3 className="font-semibold">初回ログイン用の共通パスワード</h3>
      <p className="mt-1 text-sm text-slate-600">
        新規追加した従業員に最初に案内するパスワードです。本人が初回ログイン時に自分のパスワードへ変更します。
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-48 rounded-lg border px-3 py-2 text-sm"
        />
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
