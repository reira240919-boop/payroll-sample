"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddEmployeeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("employee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "追加に失敗しました");
        return;
      }

      setName("");
      setRole("employee");
      setOpen(false);
      router.refresh();
    } catch {
      setError("サーバーに接続できませんでした。ネットワーク状況を確認してください。");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        ＋ 新規従業員追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold">新規従業員追加</h3>
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm">名前（ログインに使用）</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="山本 七郎"
            required
          />
        </div>
        <div>
          <label className="text-sm">権限</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            <option value="employee">従業員</option>
            <option value="admin">管理者</option>
          </select>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        初期パスワードは上の共通設定の値が使われます。本人が初回ログイン時に変更します。時給は追加後、一覧から編集してください。
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "追加中..." : "追加する"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
