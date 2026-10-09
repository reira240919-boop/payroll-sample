"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";

interface PaydayOption {
  id: string;
  name: string;
}

export default function PaydayOptionManager() {
  const [options, setOptions] = useState<PaydayOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/payday-options");
    if (res.ok) setOptions(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/payday-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "追加に失敗しました");
    } else {
      setNewName("");
      await load();
    }
    setSaving(false);
  }

  function startEdit(option: PaydayOption) {
    setEditingId(option.id);
    setEditName(option.name);
    setError("");
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    setError("");
    setPendingKey(`update-${id}`);
    const res = await fetch(`/api/payday-options/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setPendingKey(null);
    if (!res.ok) {
      setError(data.error || "更新に失敗しました");
      return;
    }
    setEditingId(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("この給与振込日を削除しますか？")) return;
    setPendingKey(`delete-${id}`);
    await fetch(`/api/payday-options/${id}`, { method: "DELETE" });
    setPendingKey(null);
    await load();
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-1 font-semibold">給与振込日</h3>
      <p className="mb-4 text-sm text-slate-600">
        従業員マスタで選択できる給与振込日の一覧です。追加・修正・削除できます。
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">読み込み中...</p>
      ) : (
        <div className="mb-4 space-y-2">
          {options.length === 0 && (
            <p className="text-sm text-slate-500">まだ登録されていません。</p>
          )}
          {options.map((o) =>
            editingId === o.id ? (
              <div key={o.id} className="flex items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(o.id)}
                  disabled={pendingKey === `update-${o.id}`}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {pendingKey === `update-${o.id}` && <Spinner />}
                  保存
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>{o.name}</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => startEdit(o)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    修正
                  </button>
                  <button
                    onClick={() => handleDelete(o.id)}
                    disabled={pendingKey === `delete-${o.id}`}
                    className="flex items-center gap-1 text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    {pendingKey === `delete-${o.id}` && <Spinner />}
                    削除
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="例：10日"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving && <Spinner />}
          追加
        </button>
      </form>
    </div>
  );
}
