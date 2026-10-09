"use client";

import { useState } from "react";

interface Initial {
  phone: string;
  postalCode: string;
  address: string;
  birthDate: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
}

export default function EmployeeSettingsForm({ initial }: { initial: Initial }) {
  const [form, setForm] = useState(initial);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handlePostalCodeChange(value: string) {
    setForm((f) => ({ ...f, postalCode: value }));
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length !== 7) return;

    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`);
      const data = await res.json();
      const result = data?.results?.[0];
      if (result) {
        setForm((f) => ({
          ...f,
          address: `${result.address1}${result.address2}${result.address3}`,
        }));
      }
    } catch {
      // 住所APIに接続できなくても手入力を続けられるよう、静かに無視する
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password && password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }
    if (password && password !== passwordConfirm) {
      setError("パスワード（確認用）が一致しません");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/employee/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...(password ? { password } : {}) }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "保存に失敗しました");
        return;
      }
      setPassword("");
      setPasswordConfirm("");
      setMessage("保存しました");
    } catch {
      setError("サーバーに接続できませんでした。ネットワーク状況を確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">基本情報</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">電話番号</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="090-1234-5678"
              className="mt-1 w-full rounded-lg border px-3 py-2.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium">生年月日</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2.5"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">住所</p>
        <div>
          <label className="text-sm font-medium">郵便番号</label>
          <input
            value={form.postalCode}
            onChange={(e) => handlePostalCodeChange(e.target.value)}
            placeholder="1000001"
            inputMode="numeric"
            maxLength={8}
            className="mt-1 w-full rounded-lg border px-3 py-2.5"
          />
          <p className="mt-1 text-xs text-slate-500">ハイフン(-)なしで入力</p>
        </div>
        <div className="mt-3">
          <label className="text-sm font-medium">ご住所</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="郵便番号を入力すると自動入力されます"
            className="mt-1 w-full rounded-lg border px-3 py-2.5"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">緊急連絡先</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">お名前</label>
            <input
              value={form.emergencyContactName}
              onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
              className="mt-1 w-full rounded-lg border px-3 py-2.5"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">続柄</label>
              <input
                value={form.emergencyContactRelation}
                onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })}
                placeholder="例：妻、父"
                className="mt-1 w-full rounded-lg border px-3 py-2.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium">電話番号</label>
              <input
                type="tel"
                value={form.emergencyContactPhone}
                onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                placeholder="080-9876-5432"
                className="mt-1 w-full rounded-lg border px-3 py-2.5"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">パスワード変更</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">新しいパスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2.5"
              placeholder="変更する場合のみ入力"
              minLength={6}
            />
            <p className="mt-1 text-xs text-slate-500">変更しない場合は空欄のままでOK（6文字以上）</p>
          </div>
          <div>
            <label className="text-sm font-medium">新しいパスワード（確認用）</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="もう一度入力"
              className="mt-1 w-full rounded-lg border px-3 py-2.5"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "保存中..." : "保存する"}
      </button>
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
      )}
    </form>
  );
}
