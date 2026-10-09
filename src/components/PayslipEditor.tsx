"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/payroll-utils";
import { LINE_TYPE_LABELS } from "@/lib/constants";
import PdfDownloadButton from "@/components/PdfDownloadButton";
import Spinner from "@/components/Spinner";

interface EarningLine {
  id: string;
  siteName: string;
  contractorName: string | null;
  workType: string | null;
  hours: number;
  quantityUnit: string;
  rate: number;
  amount: number;
  taxable: boolean;
  memo: string | null;
  lineType: string;
}

interface DeductionLine {
  id: string;
  itemName: string;
  quantity: number | null;
  amount: number;
  taxable: boolean;
  taxCategory: string | null;
  memo: string | null;
  lineType: string;
}

// 控除行の消費税区分（請求書の控除と同じ選択肢）。「対象外」は taxable=false として保存する
const DEFAULT_DEDUCTION_TAX_OPTIONS = ["10%対象", "8%対象"];
const TAX_EXEMPT_OPTION = "対象外";

interface Advance {
  id: string;
  balance: number;
  memo: string | null;
}

interface PayslipData {
  id: string;
  status: string;
  employee: { name: string; hourlyRate: number };
  earningLines: EarningLine[];
  deductionLines: DeductionLine[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
}

interface Props {
  payslipId: string;
  periodId: string;
  employeeId: string;
  advances: Advance[];
}

const CUSTOM_UNIT_OPTION = "__custom__";

// 単位: 一覧から選ぶか、「自分で入力…」で自由入力に切り替える
function UnitSelect({
  value,
  options,
  onChange,
  onCommit,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
}) {
  const [custom, setCustom] = useState(false);
  const isCustom = custom || (value !== "" && !options.includes(value));

  if (isCustom) {
    return (
      <div className="flex gap-1">
        <input
          autoFocus={custom}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            const typed = e.target.value.trim();
            if (typed) {
              onCommit(typed);
              return;
            }
            // 空のまま離れたら一覧に戻す
            setCustom(false);
            const first = options[0] || "";
            onChange(first);
            onCommit(first);
          }}
          placeholder="例：日"
          className="w-full min-w-0 rounded border px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setCustom(false);
            const first = options[0] || "";
            onChange(first);
            onCommit(first);
          }}
          className="shrink-0 text-[10px] text-blue-600 hover:underline"
        >
          一覧
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === CUSTOM_UNIT_OPTION) {
          setCustom(true);
          onChange("");
          return;
        }
        onChange(e.target.value);
        onCommit(e.target.value);
      }}
      className="w-full rounded border px-1 py-1 text-sm"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
      <option value={CUSTOM_UNIT_OPTION}>自分で入力…</option>
    </select>
  );
}

export default function PayslipEditor({ payslipId, periodId, employeeId, advances }: Props) {
  const router = useRouter();
  const [payslip, setPayslip] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractors, setContractors] = useState<{ id: string; name: string }[]>([]);
  const [quantityUnitOptions, setQuantityUnitOptions] = useState<string[]>(["時間", "入力なし"]);
  const [deductionTaxOptions, setDeductionTaxOptions] = useState<string[]>(DEFAULT_DEDUCTION_TAX_OPTIONS);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function runPending(key: string, fn: () => Promise<void>) {
    setPendingKey(key);
    try {
      await fn();
    } finally {
      setPendingKey((k) => (k === key ? null : k));
    }
  }

  async function loadPayslip() {
    const res = await fetch(`/api/payslips/${payslipId}`);
    if (res.ok) {
      setPayslip(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPayslip();
  }, [payslipId]);

  useEffect(() => {
    fetch("/api/contractors")
      .then((res) => (res.ok ? res.json() : []))
      .then(setContractors)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/payroll-options?type=quantity_unit")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { name: string }[]) => {
        if (data.length > 0) setQuantityUnitOptions(data.map((o) => o.name));
      });
    fetch("/api/invoice-options?type=tax_deduction")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { name: string }[]) => {
        if (data.length > 0) setDeductionTaxOptions(data.map((o) => o.name));
      })
      .catch(() => {});
  }, []);

  async function addEarningLine() {
    await runPending("add-earning", async () => {
      await fetch(`/api/payslips/${payslipId}/earning-lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: "",
          contractorName: "",
          workType: "",
          hours: 0,
          rate: payslip?.employee.hourlyRate ?? 0,
          taxable: true,
          lineType: "manual",
        }),
      });
      await loadPayslip();
      router.refresh();
    });
  }

  async function addAllowanceLine() {
    await runPending("add-allowance", async () => {
      await fetch(`/api/payslips/${payslipId}/earning-lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: "",
          amount: 0,
          taxable: true,
          lineType: "allowance",
        }),
      });
      await loadPayslip();
      router.refresh();
    });
  }

  async function updateEarningLine(line: EarningLine) {
    await fetch(`/api/payslips/${payslipId}/earning-lines/${line.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(line),
    });
    await loadPayslip();
    router.refresh();
  }

  async function deleteEarningLine(lineId: string) {
    if (!confirm("この行を削除しますか？")) return;
    await runPending(`delete-earning-${lineId}`, async () => {
      await fetch(`/api/payslips/${payslipId}/earning-lines/${lineId}`, { method: "DELETE" });
      await loadPayslip();
      router.refresh();
    });
  }

  const totalAdvanceBalance = advances.reduce((s, a) => s + a.balance, 0);

  async function addDeductionLine(type: "variable" | "advance") {
    const amount = type === "advance" ? Math.min(totalAdvanceBalance, 10000) : 0;

    await runPending(`add-deduction-${type}`, async () => {
      await fetch(`/api/payslips/${payslipId}/deduction-lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: type === "advance" ? "前払金" : "控除項目",
          amount,
          taxable: true,
          lineType: type,
        }),
      });
      await loadPayslip();
      router.refresh();
    });
  }

  async function updateDeductionLine(line: DeductionLine) {
    await fetch(`/api/payslips/${payslipId}/deduction-lines/${line.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(line),
    });
    await loadPayslip();
    router.refresh();
  }

  async function deleteDeductionLine(lineId: string) {
    if (!confirm("この行を削除しますか？")) return;
    await runPending(`delete-deduction-${lineId}`, async () => {
      await fetch(`/api/payslips/${payslipId}/deduction-lines/${lineId}`, { method: "DELETE" });
      await loadPayslip();
      router.refresh();
    });
  }

  async function regenerateFromReports() {
    if (!confirm("日報から支給行を再生成します（自動行のみ上書き）。よろしいですか？")) return;
    await runPending("regenerate", async () => {
      await fetch(`/api/payroll-periods/${periodId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: [employeeId] }),
      });
      await loadPayslip();
      router.refresh();
    });
  }

  async function deletePayslip() {
    if (!confirm("この明細を削除します。元に戻せません。よろしいですか？")) return;
    await runPending("delete-payslip", async () => {
      await fetch(`/api/payslips/${payslipId}`, { method: "DELETE" });
      router.push("/admin/approvals");
      router.refresh();
    });
  }

  if (loading) return <p>読み込み中...</p>;
  if (!payslip) return <p>明細が見つかりません</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={regenerateFromReports}
          disabled={pendingKey === "regenerate"}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {pendingKey === "regenerate" && <Spinner />}
          日報から再生成
        </button>
        <PdfDownloadButton
          href={`/api/payslips/${payslipId}/pdf`}
          label="PDFプレビュー"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        />
        {payslip.status === "draft" && (
          <button
            onClick={deletePayslip}
            disabled={pendingKey === "delete-payslip"}
            className="flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {pendingKey === "delete-payslip" && <Spinner />}
            この明細を削除
          </button>
        )}
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">支給行</h3>
          <button
            onClick={addEarningLine}
            disabled={pendingKey === "add-earning"}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {pendingKey === "add-earning" && <Spinner />}
            + 手動追加（元請け反映）
          </button>
        </div>
        <div className="space-y-3">
          {payslip.earningLines
            .filter((line) => line.lineType !== "allowance" && line.lineType !== "fixed_allowance")
            .map((line) => (
            <div key={line.id} className="space-y-2 rounded-lg border p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={line.contractorName || ""}
                  onChange={(e) => {
                    const updated = { ...line, contractorName: e.target.value };
                    setPayslip({
                      ...payslip,
                      earningLines: payslip.earningLines.map((l) =>
                        l.id === line.id ? updated : l
                      ),
                    });
                    updateEarningLine(updated);
                  }}
                  className="rounded border px-2 py-1 text-sm"
                >
                  <option value="">元請け会社（未選択）</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  value={line.siteName}
                  onChange={(e) => setPayslip({
                    ...payslip,
                    earningLines: payslip.earningLines.map((l) =>
                      l.id === line.id ? { ...l, siteName: e.target.value } : l
                    ),
                  })}
                  onBlur={() => updateEarningLine(line)}
                  placeholder="詳細（現場名・出張手当など）"
                  className="rounded border px-2 py-1 text-sm"
                />
              </div>
              <div className="grid items-end gap-2 sm:grid-cols-7">
                <div>
                  <label className="mb-1 block text-[10px] text-slate-400">作業種別</label>
                  <input
                    value={line.workType || ""}
                    onChange={(e) => {
                      const updated = { ...line, workType: e.target.value };
                      setPayslip({
                        ...payslip,
                        earningLines: payslip.earningLines.map((l) =>
                          l.id === line.id ? updated : l
                        ),
                      });
                    }}
                    onBlur={() => updateEarningLine({ ...line, workType: line.workType })}
                    placeholder="例：足場工"
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-slate-400">数量</label>
                  <input
                    type="number"
                    step="0.5"
                    value={line.hours === 0 ? "" : line.hours}
                    onChange={(e) => {
                      const hours = parseFloat(e.target.value) || 0;
                      const updated = { ...line, hours, amount: Math.round(hours * line.rate) };
                      setPayslip({
                        ...payslip,
                        earningLines: payslip.earningLines.map((l) =>
                          l.id === line.id ? updated : l
                        ),
                      });
                    }}
                    onBlur={() => updateEarningLine(line)}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-slate-400">単位</label>
                  <select
                    value={line.quantityUnit}
                    onChange={(e) => {
                      const updated = { ...line, quantityUnit: e.target.value };
                      setPayslip({
                        ...payslip,
                        earningLines: payslip.earningLines.map((l) =>
                          l.id === line.id ? updated : l
                        ),
                      });
                      updateEarningLine(updated);
                    }}
                    className="w-full rounded border px-1 py-1 text-sm"
                  >
                    {quantityUnitOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] text-slate-400">単価</label>
                  <input
                    type="number"
                    value={line.rate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      const updated = { ...line, rate, amount: Math.round(line.hours * rate) };
                      setPayslip({
                        ...payslip,
                        earningLines: payslip.earningLines.map((l) =>
                          l.id === line.id ? updated : l
                        ),
                      });
                    }}
                    onBlur={() => updateEarningLine(line)}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <label className="flex items-center gap-1 pb-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={line.taxable}
                    onChange={(e) => {
                      const updated = { ...line, taxable: e.target.checked };
                      setPayslip({
                        ...payslip,
                        earningLines: payslip.earningLines.map((l) =>
                          l.id === line.id ? updated : l
                        ),
                      });
                      updateEarningLine(updated);
                    }}
                  />
                  消費税対象
                </label>
                <div className="col-span-2 flex items-end justify-between gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] text-slate-400">金額</label>
                    <input
                      type="number"
                      value={line.amount === 0 ? "" : line.amount}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0;
                        const updated = { ...line, amount };
                        setPayslip({
                          ...payslip,
                          earningLines: payslip.earningLines.map((l) =>
                            l.id === line.id ? updated : l
                          ),
                        });
                      }}
                      onBlur={() => updateEarningLine(line)}
                      className="w-full rounded border px-2 py-1 text-sm font-medium"
                    />
                  </div>
                  <button
                    onClick={() => deleteEarningLine(line.id)}
                    disabled={pendingKey === `delete-earning-${line.id}`}
                    className="flex items-center gap-1 pb-1.5 text-xs text-red-600 disabled:opacity-50"
                  >
                    {pendingKey === `delete-earning-${line.id}` && <Spinner />}
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">手当</h3>
          <button
            onClick={addAllowanceLine}
            disabled={pendingKey === "add-allowance"}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {pendingKey === "add-allowance" && <Spinner />}
            + 手当を追加
          </button>
        </div>
        <div className="space-y-3">
          {payslip.earningLines
            .filter((line) => line.lineType === "allowance" || line.lineType === "fixed_allowance")
            .map((line) => (
              <div key={line.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-7">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">手当名</label>
                  <input
                    value={line.siteName}
                    onChange={(e) => setPayslip({
                      ...payslip,
                      earningLines: payslip.earningLines.map((l) =>
                        l.id === line.id ? { ...l, siteName: e.target.value } : l
                      ),
                    })}
                    onBlur={() => updateEarningLine(line)}
                    placeholder="例：出張手当"
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">数量</label>
                  <input
                    type="number"
                    step="0.5"
                    value={line.hours === 0 ? "" : line.hours}
                    onChange={(e) => {
                      const hours = parseFloat(e.target.value) || 0;
                      // 単価が入っている手当だけ金額を自動計算（単価なしの手当は金額を直接入力）
                      const updated = {
                        ...line,
                        hours,
                        amount: line.rate > 0 ? Math.round(hours * line.rate) : line.amount,
                      };
                      setPayslip({
                        ...payslip,
                        earningLines: payslip.earningLines.map((l) =>
                          l.id === line.id ? updated : l
                        ),
                      });
                    }}
                    onBlur={() => updateEarningLine(line)}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">単位</label>
                  <UnitSelect
                    value={line.quantityUnit}
                    options={quantityUnitOptions}
                    onChange={(quantityUnit) =>
                      setPayslip({
                        ...payslip,
                        earningLines: payslip.earningLines.map((l) =>
                          l.id === line.id ? { ...l, quantityUnit } : l
                        ),
                      })
                    }
                    onCommit={(quantityUnit) => updateEarningLine({ ...line, quantityUnit })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">単価</label>
                  <input
                    type="number"
                    value={line.rate === 0 ? "" : line.rate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      // 数量が空なら 1 回分として単価をそのまま金額にする
                      const amount = Math.round((line.hours > 0 ? line.hours : 1) * rate);
                      const updated = { ...line, rate, amount };
                      setPayslip({
                        ...payslip,
                        earningLines: payslip.earningLines.map((l) =>
                          l.id === line.id ? updated : l
                        ),
                      });
                    }}
                    onBlur={() => updateEarningLine(line)}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">金額</label>
                  <input
                    type="number"
                    value={line.amount === 0 ? "" : line.amount}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      const updated = { ...line, amount };
                      setPayslip({
                        ...payslip,
                        earningLines: payslip.earningLines.map((l) =>
                          l.id === line.id ? updated : l
                        ),
                      });
                    }}
                    onBlur={() => updateEarningLine(line)}
                    className="w-full rounded border px-2 py-1 text-sm font-medium"
                  />
                </div>
                <div className="flex items-end justify-between gap-2">
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={line.taxable}
                      onChange={(e) => {
                        const updated = { ...line, taxable: e.target.checked };
                        setPayslip({
                          ...payslip,
                          earningLines: payslip.earningLines.map((l) =>
                            l.id === line.id ? updated : l
                          ),
                        });
                        updateEarningLine(updated);
                      }}
                    />
                    消費税対象
                  </label>
                  {line.lineType === "fixed_allowance" ? (
                    <span className="text-xs text-slate-400">毎月自動</span>
                  ) : (
                    <button
                      onClick={() => deleteEarningLine(line.id)}
                      disabled={pendingKey === `delete-earning-${line.id}`}
                      className="flex items-center gap-1 text-xs text-red-600 disabled:opacity-50"
                    >
                      {pendingKey === `delete-earning-${line.id}` && <Spinner />}
                      削除
                    </button>
                  )}
                </div>
              </div>
            ))}
          {payslip.earningLines.filter(
            (line) => line.lineType === "allowance" || line.lineType === "fixed_allowance"
          ).length === 0 && <p className="text-sm text-slate-500">手当はまだありません。</p>}
          <p className="text-xs text-slate-400">
            毎月自動で表示したい手当は、従業員マスタの編集画面で登録してください。ここで追加した手当はこの月だけ反映されます。
          </p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">控除行</h3>
          <div className="flex gap-2">
            <button
              onClick={() => addDeductionLine("variable")}
              disabled={pendingKey === "add-deduction-variable"}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline disabled:opacity-50"
            >
              {pendingKey === "add-deduction-variable" && <Spinner />}
              + 変動控除
            </button>
            {totalAdvanceBalance > 0 && (
              <button
                onClick={() => addDeductionLine("advance")}
                disabled={pendingKey === "add-deduction-advance"}
                className="flex items-center gap-1 text-sm text-orange-600 hover:underline disabled:opacity-50"
              >
                {pendingKey === "add-deduction-advance" && <Spinner />}
                + 前払金（残 ¥{totalAdvanceBalance.toLocaleString()}）
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {payslip.deductionLines.map((line) => (
            <div key={line.id} className="flex items-end gap-2 rounded-lg border p-3">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] text-slate-400">項目</label>
                <input
                  value={line.itemName}
                  onChange={(e) => setPayslip({
                    ...payslip,
                    deductionLines: payslip.deductionLines.map((l) =>
                      l.id === line.id ? { ...l, itemName: e.target.value } : l
                    ),
                  })}
                  onBlur={() => updateDeductionLine(line)}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div className="w-20">
                <label className="mb-1 block text-[10px] text-slate-400">数量</label>
                <input
                  type="number"
                  step="any"
                  value={line.quantity ?? ""}
                  onChange={(e) => {
                    const quantity = e.target.value === "" ? null : parseFloat(e.target.value);
                    const updated = { ...line, quantity };
                    setPayslip({
                      ...payslip,
                      deductionLines: payslip.deductionLines.map((l) =>
                        l.id === line.id ? updated : l
                      ),
                    });
                  }}
                  onBlur={() => updateDeductionLine(line)}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-[10px] text-slate-400">金額</label>
                <input
                  type="number"
                  value={line.amount === 0 ? "" : line.amount}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    const updated = { ...line, amount };
                    setPayslip({
                      ...payslip,
                      deductionLines: payslip.deductionLines.map((l) =>
                        l.id === line.id ? updated : l
                      ),
                    });
                  }}
                  onBlur={() => updateDeductionLine(line)}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
              </div>
              <div className="w-24">
                <label className="mb-1 block text-[10px] text-slate-400">消費税</label>
                <select
                  value={line.taxable ? line.taxCategory || "10%対象" : TAX_EXEMPT_OPTION}
                  onChange={(e) => {
                    const value = e.target.value;
                    const updated =
                      value === TAX_EXEMPT_OPTION
                        ? { ...line, taxable: false }
                        : { ...line, taxable: true, taxCategory: value };
                    setPayslip({
                      ...payslip,
                      deductionLines: payslip.deductionLines.map((l) =>
                        l.id === line.id ? updated : l
                      ),
                    });
                    updateDeductionLine(updated);
                  }}
                  className="w-full rounded border px-1 py-1 text-sm"
                >
                  {deductionTaxOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value={TAX_EXEMPT_OPTION}>{TAX_EXEMPT_OPTION}</option>
                </select>
              </div>
              <span className="pb-1.5 text-xs text-slate-500">
                {LINE_TYPE_LABELS[line.lineType] || line.lineType}
              </span>
              {line.lineType !== "fixed" && (
                <button
                  onClick={() => deleteDeductionLine(line.id)}
                  disabled={pendingKey === `delete-deduction-${line.id}`}
                  className="flex items-center gap-1 pb-1.5 text-xs text-red-600 disabled:opacity-50"
                >
                  {pendingKey === `delete-deduction-${line.id}` && <Spinner />}
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-xl bg-blue-50 p-4">
        <div className="flex justify-between text-sm">
          <span>支給合計</span>
          <span>{formatCurrency(payslip.totalEarnings)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>控除合計</span>
          <span>{formatCurrency(payslip.totalDeductions)}</span>
        </div>
        <div className="mt-2 flex justify-between text-lg font-bold">
          <span>差引支給額</span>
          <span>{formatCurrency(payslip.netPay)}</span>
        </div>
      </div>
    </div>
  );
}
