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

export default function SetupForm({
  name: initialName,
  isAdmin,
  initial,
}: {
  name: string;
  isAdmin: boolean;
  initial: Initial;
}) {
  const [name, setName] = useState(initialName);
  const [form, setForm] = useState(initial);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    if (!password || password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }
    if (password !== passwordConfirm) {
      setError("パスワード（確認用）が一致しません");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isAdmin ? { name, password } : { ...form, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "登録に失敗しました");
        return;
      }

      window.location.href =
        data.role === "admin" ? "/admin/daily-reports" : "/employee/daily-reports/new";
    } catch {
      setError("サーバーに接続できませんでした。ネットワーク状況を確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          アカウント
        </p>
        <label className="text-sm font-medium">お名前（ログインID）</label>
        {isAdmin ? (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2.5"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              次回からはこの名前でログインします
            </p>
          </>
        ) : (
          <>
            <input
              value={name}
              readOnly
              className="mt-1 w-full rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 font-medium text-slate-900"
            />
            <p className="mt-1 text-xs text-slate-500">
              管理者が登録した名前です（ログインに使うため変更できません）
            </p>
          </>
        )}
      </div>

      {!isAdmin && (
        <>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              基本情報
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">電話番号</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="090-1234-5678"
                  className="mt-1 w-full rounded-lg border px-3 py-2.5"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">生年月日</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5"
                  required
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">住所</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">郵便番号</label>
                <input
                  value={form.postalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  placeholder="1000001"
                  inputMode="numeric"
                  maxLength={8}
                  className="mt-1 w-full rounded-lg border px-3 py-2.5"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">ハイフン(-)なしで入力</p>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium">ご住所</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="郵便番号を入力すると自動入力されます"
                className="mt-1 w-full rounded-lg border px-3 py-2.5"
                required
              />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              緊急連絡先
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">お名前</label>
                <input
                  value={form.emergencyContactName}
                  onChange={(e) =>
                    setForm({ ...form, emergencyContactName: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2.5"
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">続柄</label>
                  <input
                    value={form.emergencyContactRelation}
                    onChange={(e) =>
                      setForm({ ...form, emergencyContactRelation: e.target.value })
                    }
                    placeholder="例：妻、父"
                    className="mt-1 w-full rounded-lg border px-3 py-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">電話番号</label>
                  <input
                    type="tel"
                    value={form.emergencyContactPhone}
                    onChange={(e) =>
                      setForm({ ...form, emergencyContactPhone: e.target.value })
                    }
                    placeholder="080-9876-5432"
                    className="mt-1 w-full rounded-lg border px-3 py-2.5"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          パスワード設定
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">新しいパスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2.5"
              required
              minLength={6}
            />
            <p className="mt-1 text-xs text-slate-500">6文字以上で入力してください</p>
          </div>
          <div>
            <label className="text-sm font-medium">新しいパスワード（確認用）</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="もう一度入力"
              className="mt-1 w-full rounded-lg border px-3 py-2.5"
              required
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "登録中..." : "登録して始める"}
      </button>
    </form>
  );
}
