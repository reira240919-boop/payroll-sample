"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

const PAYDAY_OPTIONS = ["15日", "25日", "月末"];
const PAYMENT_METHOD_OPTIONS = ["振込", "手渡し"];

interface Deduction {
  id: string;
  itemName: string;
  amount: number;
  sortOrder: number;
}

interface Allowance {
  id: string;
  itemName: string;
  amount: number;
  taxable: boolean;
  sortOrder: number;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  hourlyRate: number;
  overtimeMultiplier: number;
  closingDay: number | null;
  payday: string | null;
  paymentMethod: string;
  role: string;
  active: boolean;
  phone: string | null;
  postalCode: string | null;
  address: string | null;
  birthDate: string | Date | null;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  invoiceRegistrationNumber: string | null;
  fixedDeductions: Deduction[];
  fixedAllowances: Allowance[];
}

function toDateInputValue(value: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

function stripInvoicePrefix(value: string | null) {
  if (!value) return "";
  return value.replace(/^T/i, "");
}

// 読み間違えやすい文字（0/O/o, 1/l/I）を除いた英数字
const PASSWORD_LETTERS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_DIGITS = "23456789";

function generatePassword(length = 8) {
  const chars = PASSWORD_LETTERS + PASSWORD_DIGITS;
  const random = (max: number) => crypto.getRandomValues(new Uint32Array(1))[0] % max;
  while (true) {
    const pw = Array.from({ length }, () => chars[random(chars.length)]).join("");
    if (/[a-zA-Z]/.test(pw) && /[0-9]/.test(pw)) return pw;
  }
}

export default function EmployeeEditForm({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [form, setForm] = useState({
    name: employee.name,
    email: employee.email || "",
    hourlyRate: employee.hourlyRate.toString(),
    overtimeMultiplier: employee.overtimeMultiplier.toString(),
    closingDay: employee.closingDay ? employee.closingDay.toString() : "",
    payday: employee.payday || "",
    paymentMethod: employee.paymentMethod || "振込",
    role: employee.role,
    active: employee.active,
    invoiceRegistrationNumber: stripInvoicePrefix(employee.invoiceRegistrationNumber),
    password: "",
    phone: employee.phone || "",
    postalCode: employee.postalCode || "",
    address: employee.address || "",
    birthDate: toDateInputValue(employee.birthDate),
    emergencyContactName: employee.emergencyContactName || "",
    emergencyContactRelation: employee.emergencyContactRelation || "",
    emergencyContactPhone: employee.emergencyContactPhone || "",
  });
  const [deductions, setDeductions] = useState(employee.fixedDeductions);
  const [allowances, setAllowances] = useState(employee.fixedAllowances);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          hourlyRate: parseFloat(form.hourlyRate) || 0,
          overtimeMultiplier: parseFloat(form.overtimeMultiplier) || 1.25,
          closingDay: form.closingDay ? parseInt(form.closingDay, 10) : null,
          invoiceRegistrationNumber: form.invoiceRegistrationNumber
            ? `T${form.invoiceRegistrationNumber}`
            : "",
          fixedDeductions: deductions,
          fixedAllowances: allowances,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setIsError(true);
        setMessage(data.error || "保存に失敗しました");
        return;
      }
      setMessage("保存しました");
      setForm((f) => ({ ...f, password: "" }));
      setShowPassword(false);
      setPasswordCopied(false);
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("サーバーに接続できませんでした。ネットワーク状況を確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">名前（ログインに使用）</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">メール（任意）</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">時給（円）</label>
          <input
            type="number"
            value={form.hourlyRate}
            onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">残業倍率</label>
          <input
            type="number"
            step="0.01"
            value={form.overtimeMultiplier}
            onChange={(e) => setForm({ ...form, overtimeMultiplier: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">締め日</label>
          <select
            value={form.closingDay}
            onChange={(e) => setForm({ ...form, closingDay: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            <option value="">月末締め（1日〜末日）</option>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}日締め
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">給与振込日</label>
          <div className="mt-1 flex gap-2">
            {PAYDAY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setForm({ ...form, payday: opt })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  form.payday === opt
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">支払い方法</label>
          <div className="mt-1 flex gap-2">
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setForm({ ...form, paymentMethod: opt })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  form.paymentMethod === opt
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">権限</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            <option value="employee">従業員</option>
            <option value="admin">管理者</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">アカウント状態</label>
          <label className="mt-1 flex h-[42px] items-center gap-2 rounded-lg border px-3 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            有効（オフにするとログインできなくなります）
          </label>
        </div>
        <div>
          <label className="text-sm font-medium">インボイス登録番号（任意）</label>
          <div className="mt-1 flex items-stretch">
            <span className="flex items-center rounded-l-lg border border-r-0 bg-slate-50 px-3 text-sm font-medium text-slate-500">
              T
            </span>
            <input
              inputMode="numeric"
              autoComplete="off"
              value={form.invoiceRegistrationNumber}
              onChange={(e) =>
                setForm({
                  ...form,
                  invoiceRegistrationNumber: e.target.value.replace(/[^0-9]/g, "").slice(0, 13),
                })
              }
              placeholder="1234567890123"
              className="w-full rounded-r-lg border px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">パスワード変更（任意）</label>
          <div className="mt-1 flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1 basis-40">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  setPasswordCopied(false);
                }}
                autoComplete="new-password"
                className="w-full rounded-lg border px-3 py-2 pr-10"
                placeholder="変更する場合のみ入力"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
                aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setForm({ ...form, password: generatePassword() });
                setShowPassword(true);
                setPasswordCopied(false);
              }}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
            >
              自動で作る
            </button>
            {form.password && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(form.password);
                    setPasswordCopied(true);
                  } catch {
                    setShowPassword(true);
                    alert("コピーできませんでした。表示されたパスワードを書き写してください。");
                  }
                }}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  passwordCopied ? "border-green-600 bg-green-50 text-green-700" : "hover:bg-slate-50"
                }`}
              >
                {passwordCopied ? "コピーしました" : "コピー"}
              </button>
            )}
          </div>
          {form.password && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠ 保存を押すとこの欄は消え、あとから確認できません。先にコピーして、ご本人に伝えてください。
            </p>
          )}
        </div>
      </div>

      <h3 className="mb-3 mt-6 font-semibold">個人情報</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">電話番号</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="090-1234-5678"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">生年月日</label>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">郵便番号</label>
          <input
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            placeholder="123-4567"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">住所</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <h3 className="mb-3 mt-6 font-semibold">緊急連絡先</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium">氏名</label>
          <input
            value={form.emergencyContactName}
            onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">続柄</label>
          <input
            value={form.emergencyContactRelation}
            onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })}
            placeholder="例：妻、父"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">電話番号</label>
          <input
            type="tel"
            value={form.emergencyContactPhone}
            onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
            placeholder="090-1234-5678"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <h3 className="mb-3 mt-6 font-semibold">固定控除テンプレート</h3>
      <div className="space-y-2">
        {deductions.map((d, i) => (
          <div key={d.id} className="flex gap-2">
            <input
              value={d.itemName}
              onChange={(e) => {
                const next = [...deductions];
                next[i] = { ...d, itemName: e.target.value };
                setDeductions(next);
              }}
              placeholder="項目名"
              className="flex-1 rounded-lg border px-3 py-2"
            />
            <input
              type="number"
              value={d.amount}
              onChange={(e) => {
                const next = [...deductions];
                next[i] = { ...d, amount: parseFloat(e.target.value) || 0 };
                setDeductions(next);
              }}
              className="w-32 rounded-lg border px-3 py-2"
              placeholder="金額"
            />
            <button
              type="button"
              onClick={() => setDeductions(deductions.filter((_, idx) => idx !== i))}
              className="rounded-lg px-3 text-red-600 hover:bg-red-50"
              aria-label="削除"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setDeductions([
            ...deductions,
            {
              id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              itemName: "",
              amount: 0,
              sortOrder: deductions.length,
            },
          ])
        }
        className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        ＋ 項目を追加
      </button>

      <h3 className="mb-1 mt-6 font-semibold">固定手当テンプレート</h3>
      <p className="mb-3 text-xs text-slate-500">
        ここに登録した手当は、毎月の明細生成時に自動で反映されます。
      </p>
      <div className="space-y-2">
        {allowances.map((a, i) => (
          <div key={a.id} className="flex items-center gap-2">
            <input
              value={a.itemName}
              onChange={(e) => {
                const next = [...allowances];
                next[i] = { ...a, itemName: e.target.value };
                setAllowances(next);
              }}
              placeholder="項目名（例：出張手当）"
              className="flex-1 rounded-lg border px-3 py-2"
            />
            <input
              type="number"
              value={a.amount}
              onChange={(e) => {
                const next = [...allowances];
                next[i] = { ...a, amount: parseFloat(e.target.value) || 0 };
                setAllowances(next);
              }}
              className="w-32 rounded-lg border px-3 py-2"
              placeholder="金額"
            />
            <label className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-600">
              <input
                type="checkbox"
                checked={a.taxable}
                onChange={(e) => {
                  const next = [...allowances];
                  next[i] = { ...a, taxable: e.target.checked };
                  setAllowances(next);
                }}
              />
              消費税対象
            </label>
            <button
              type="button"
              onClick={() => setAllowances(allowances.filter((_, idx) => idx !== i))}
              className="rounded-lg px-3 text-red-600 hover:bg-red-50"
              aria-label="削除"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setAllowances([
            ...allowances,
            {
              id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              itemName: "",
              amount: 0,
              taxable: true,
              sortOrder: allowances.length,
            },
          ])
        }
        className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        ＋ 項目を追加
      </button>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
        <div className="mt-3">
          <BackButton label="一覧に戻る" fallbackHref="/admin/employees" />
        </div>
      </div>
    </form>
  );
}
