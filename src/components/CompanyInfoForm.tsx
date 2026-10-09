"use client";

import { useState } from "react";
import type { CompanyInfo } from "@/lib/settings";

function stripInvoicePrefix(value: string) {
  if (!value) return "";
  return value.replace(/^T/i, "");
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// PDF generation only supports these formats; anything else saves fine but
// breaks every payslip/invoice PDF the next time one is generated.
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("PNG・JPEG・SVG形式の画像を選んでください");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("2MB以下の画像を選んでください");
      return;
    }
    onChange(await readFileAsDataUrl(file));
  }

  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-12 w-auto rounded border bg-white p-1" />
        )}
        <input
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="text-xs"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function CompanyInfoForm({ initial }: { initial: CompanyInfo }) {
  const [form, setForm] = useState({
    ...initial,
    invoiceRegistrationNumber: stripInvoicePrefix(initial.invoiceRegistrationNumber),
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch("/api/settings/company-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          invoiceRegistrationNumber: form.invoiceRegistrationNumber
            ? `T${form.invoiceRegistrationNumber}`
            : "",
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setIsError(true);
        setMessage(data.error || "保存に失敗しました");
        return;
      }
      setMessage("保存しました");
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
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">会社名</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="サンプル工業"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">インボイス登録番号</label>
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
          <label className="text-sm font-medium">郵便番号</label>
          <input
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            placeholder="1000001"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
          <p className="mt-1 text-xs text-slate-500">ハイフン(-)なしで入力</p>
        </div>
        <div>
          <label className="text-sm font-medium">住所</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="東京都千代田区サンプル1-2-3"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">電話番号</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="000-0000-0000"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">FAX番号</label>
          <input
            value={form.fax}
            onChange={(e) => setForm({ ...form, fax: e.target.value })}
            placeholder="000-0000-0000"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <h3 className="mb-1 mt-6 font-semibold">ロゴ・社印</h3>
      <p className="mb-3 text-xs text-slate-500">
        給与明細・請求書PDFの右上に表示されます。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUploadField
          label="ロゴ画像"
          value={form.logoDataUrl}
          onChange={(dataUrl) => setForm({ ...form, logoDataUrl: dataUrl })}
        />
        <ImageUploadField
          label="社印画像"
          value={form.sealDataUrl}
          onChange={(dataUrl) => setForm({ ...form, sealDataUrl: dataUrl })}
        />
      </div>

      <h3 className="mb-1 mt-6 font-semibold">振込先口座</h3>
      <p className="mb-3 text-xs text-slate-500">
        請求書PDFの左下に表示されます。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">銀行名</label>
          <input
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            placeholder="サンプル銀行"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">支店名</label>
          <input
            value={form.bankBranch}
            onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
            placeholder="サンプル支店"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">口座種別</label>
          <input
            value={form.bankAccountType}
            onChange={(e) => setForm({ ...form, bankAccountType: e.target.value })}
            placeholder="普通"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">口座番号</label>
          <input
            value={form.bankAccountNumber}
            onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
            placeholder="1234567"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium">口座名義</label>
          <input
            value={form.bankAccountHolder}
            onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value })}
            placeholder="株式会社 サンプル工業"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <h3 className="mb-1 mt-6 font-semibold">請求書メールの初期文面</h3>
      <p className="mb-3 text-xs text-slate-500">
        「メールで送信」を押した時に最初から入力されている件名・本文です。送信前にその場で書き換えることもできます。
        {"{会社名}"}・{"{契約者名}"}・{"{期間}"} と書くと、送信時にそれぞれ自動で置き換わります。
      </p>
      <div className="grid gap-4">
        <div>
          <label className="text-sm font-medium">件名</label>
          <input
            value={form.invoiceMailSubject}
            onChange={(e) => setForm({ ...form, invoiceMailSubject: e.target.value })}
            placeholder="【{会社名}】請求書のご送付（{期間}）"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">本文</label>
          <textarea
            value={form.invoiceMailBody}
            onChange={(e) => setForm({ ...form, invoiceMailBody: e.target.value })}
            rows={6}
            placeholder="{契約者名} 御中..."
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <h3 className="mb-1 mt-6 font-semibold">税理士への送付</h3>
      <p className="mb-3 text-xs text-slate-500">
        承認・確定画面の「税理士にまとめて送信」でこのメールアドレスが送信先の初期値になります。
      </p>
      <div>
        <label className="text-sm font-medium">税理士メールアドレス</label>
        <input
          type="email"
          value={form.taxAccountantEmail}
          onChange={(e) => setForm({ ...form, taxAccountantEmail: e.target.value })}
          placeholder="tax-accountant@example.com"
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
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
    </form>
  );
}
