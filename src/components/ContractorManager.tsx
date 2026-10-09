"use client";

import { useEffect, useState } from "react";

interface Contractor {
  id: string;
  name: string;
  email: string | null;
}

export default function ContractorManager() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowSaving, setRowSaving] = useState<Record<string, boolean>>({});
  const [rowSaved, setRowSaved] = useState<Record<string, boolean>>({});

  async function load() {
    const res = await fetch("/api/contractors");
    if (res.ok) {
      const data: Contractor[] = await res.json();
      setContractors(data);
      setEmailDrafts(Object.fromEntries(data.map((c) => [c.id, c.email || ""])));
      setNameDrafts(Object.fromEntries(data.map((c) => [c.id, c.name])));
    }
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
    const res = await fetch("/api/contractors", {
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

  async function handleDelete(id: string) {
    if (!confirm("この元請け会社を削除しますか？")) return;
    await fetch(`/api/contractors/${id}`, { method: "DELETE" });
    await load();
  }

  async function saveRow(id: string) {
    const name = (nameDrafts[id] || "").trim();
    if (!name) {
      setRowErrors({ ...rowErrors, [id]: "会社名を入力してください" });
      return;
    }
    setRowSaving({ ...rowSaving, [id]: true });
    setRowErrors({ ...rowErrors, [id]: "" });
    const res = await fetch(`/api/contractors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: emailDrafts[id] || "" }),
    });
    const data = await res.json().catch(() => ({}));
    setRowSaving({ ...rowSaving, [id]: false });
    if (!res.ok) {
      setRowErrors({ ...rowErrors, [id]: data.error || "更新に失敗しました" });
      return;
    }
    await load();
    setRowSaved({ ...rowSaved, [id]: true });
    setTimeout(() => {
      setRowSaved((prev) => ({ ...prev, [id]: false }));
    }, 2000);
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-1 font-semibold">元請け会社</h3>
      <p className="mb-4 text-sm text-slate-600">
        日報入力時に選択できる元請け会社の一覧です。ここで登録した会社名のみ選択できます。
        メールアドレスを登録しておくと、請求書の送信時に宛先として使われます。
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">読み込み中...</p>
      ) : (
        <div className="mb-4 space-y-2">
          {contractors.length === 0 && (
            <p className="text-sm text-slate-500">まだ登録されていません。</p>
          )}
          {contractors.map((c) => {
            const dirty =
              (nameDrafts[c.id] || "") !== c.name || (emailDrafts[c.id] || "") !== (c.email || "");
            return (
              <div key={c.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="mb-1.5 flex items-center gap-2">
                  <input
                    value={nameDrafts[c.id] ?? ""}
                    onChange={(e) => setNameDrafts({ ...nameDrafts, [c.id]: e.target.value })}
                    className="flex-1 rounded border px-2 py-1 text-sm font-medium"
                  />
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="shrink-0 text-xs text-red-600 hover:underline"
                  >
                    削除
                  </button>
                </div>
                {rowErrors[c.id] && (
                  <p className="mb-1.5 text-xs text-red-600">{rowErrors[c.id]}</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailDrafts[c.id] ?? ""}
                    onChange={(e) => setEmailDrafts({ ...emailDrafts, [c.id]: e.target.value })}
                    placeholder="請求書の送信先メールアドレス"
                    className="flex-1 rounded border px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() => saveRow(c.id)}
                    disabled={!dirty || rowSaving[c.id]}
                    className="shrink-0 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                  >
                    {rowSaving[c.id] ? "保存中..." : "保存"}
                  </button>
                </div>
                {rowSaved[c.id] && (
                  <p className="mt-1.5 text-xs text-green-600">保存しました</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="〇〇建設株式会社"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          追加
        </button>
      </form>
      {error && (
        <div className="mt-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
