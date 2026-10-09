"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/payroll-utils";
import { calcConsumptionTax } from "@/lib/invoice";
import PdfDownloadButton from "@/components/PdfDownloadButton";
import InvoiceDailyReportPanel from "@/components/InvoiceDailyReportPanel";
import Spinner from "@/components/Spinner";

const DEFAULT_UNIT_OPTIONS = ["時間", "式", "個", "往復", "工"];
const DEFAULT_TAX_CHARGE_OPTIONS = ["10%対象"];
const DEFAULT_TAX_DEDUCTION_OPTIONS = ["10%対象", "8%対象"];

function taxRateFor(category: string | null): number | null {
  if (category === "10%対象") return 0.1;
  if (category === "8%対象") return 0.08;
  return null;
}

interface Line {
  id: string;
  section: string;
  groupLabel: string | null;
  content: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number;
  taxCategory: string | null;
}

interface InvoiceData {
  id: string;
  issueDate: string;
  periodLabel: string;
  memo: string | null;
  contractor: { id: string; name: string };
  lines: Line[];
}

function LineRow({
  line,
  showUnit,
  unitOptions,
  deductionOptions,
  taxOptions,
  onPatch,
  onSave,
  onDelete,
  deleting,
}: {
  line: Line;
  showUnit: boolean;
  unitOptions: string[];
  deductionOptions: string[];
  taxOptions: string[];
  onPatch: (lineId: string, patch: Partial<Line>) => void;
  onSave: (line: Line) => void;
  onDelete: (lineId: string) => void;
  deleting?: boolean;
}) {
  const [taxInclusiveInput, setTaxInclusiveInput] = useState(false);
  const [preTaxInclusiveValues, setPreTaxInclusiveValues] = useState<{
    unitPrice: number | null;
    amount: number;
  } | null>(null);
  const [forceCustomContent, setForceCustomContent] = useState(false);
  const gridCols = showUnit
    ? "grid-cols-[1fr_50px_70px_90px_100px_130px_46px_24px] min-w-[720px]"
    : "grid-cols-[1fr_70px_90px_100px_130px_46px_24px] min-w-[660px]";

  const hasDeductionOptions = !showUnit && deductionOptions.length > 0;
  const contentMatchesOption = hasDeductionOptions && deductionOptions.includes(line.content);
  const showCustomContentInput =
    showUnit || !hasDeductionOptions || forceCustomContent || (line.content !== "" && !contentMatchesOption);

  return (
    <div className={`grid ${gridCols} items-start gap-2 border-b border-slate-100 py-2 last:border-0`}>
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">内容</label>
        {showCustomContentInput ? (
          <>
            <input
              type="text"
              value={line.content}
              onChange={(e) => onPatch(line.id, { content: e.target.value })}
              onBlur={() => onSave(line)}
              placeholder="例：クレーン運転"
              className="w-full rounded border px-1.5 py-1 text-xs"
            />
            {hasDeductionOptions && (
              <button
                type="button"
                onClick={() => {
                  setForceCustomContent(false);
                  onPatch(line.id, { content: "" });
                  onSave({ ...line, content: "" });
                }}
                className="mt-0.5 text-[10px] text-blue-600 hover:underline"
              >
                一覧から選ぶ
              </button>
            )}
          </>
        ) : (
          <select
            value={line.content}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "__custom__") {
                setForceCustomContent(true);
                return;
              }
              onPatch(line.id, { content: value });
              onSave({ ...line, content: value });
            }}
            className="w-full rounded border px-1 py-1 text-xs"
          >
            <option value="">選択してください</option>
            {deductionOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            <option value="__custom__">直接入力する</option>
          </select>
        )}
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">
          数量{!showUnit && "（個）"}
        </label>
        <input
          type="number"
          step="any"
          value={line.quantity ?? ""}
          onChange={(e) => {
            const quantity = e.target.value === "" ? null : parseFloat(e.target.value);
            const amount =
              quantity !== null && line.unitPrice !== null
                ? Math.round(quantity * line.unitPrice)
                : line.amount;
            onPatch(line.id, { quantity, amount });
          }}
          onBlur={() => onSave(line)}
          className="w-full rounded border px-1.5 py-1 text-xs"
        />
      </div>
      {showUnit && (
        <div>
          <label className="mb-1 block text-[10px] text-slate-400">単位</label>
          <select
            value={line.unit || ""}
            onChange={(e) => {
              const unit = e.target.value;
              onPatch(line.id, { unit });
              onSave({ ...line, unit });
            }}
            className="w-full rounded border px-1 py-1 text-xs"
          >
            <option value=""></option>
            {unitOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">単価</label>
        <input
          type="number"
          step="any"
          value={line.unitPrice ?? ""}
          onChange={(e) => {
            const unitPrice = e.target.value === "" ? null : parseFloat(e.target.value);
            const amount =
              unitPrice !== null && line.quantity !== null
                ? Math.round(line.quantity * unitPrice)
                : line.amount;
            onPatch(line.id, { unitPrice, amount });
          }}
          onBlur={() => onSave(line)}
          className="w-full rounded border px-1.5 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">金額</label>
        <input
          type="number"
          value={line.amount}
          onChange={(e) => onPatch(line.id, { amount: parseFloat(e.target.value) || 0 })}
          onBlur={() => onSave(line)}
          className="w-full rounded border px-1.5 py-1 text-xs font-medium"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">概要</label>
        <select
          value={line.taxCategory || ""}
          onChange={(e) => {
            const taxCategory = e.target.value;
            if (taxRateFor(taxCategory) === null && taxInclusiveInput && preTaxInclusiveValues) {
              setTaxInclusiveInput(false);
              const { unitPrice, amount } = preTaxInclusiveValues;
              setPreTaxInclusiveValues(null);
              onPatch(line.id, { taxCategory, unitPrice, amount });
              onSave({ ...line, taxCategory, unitPrice, amount });
              return;
            }
            onPatch(line.id, { taxCategory });
            onSave({ ...line, taxCategory });
          }}
          className="w-full rounded border px-1 py-1 text-xs"
        >
          <option value=""></option>
          {taxOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[10px] text-slate-400">税込入力</label>
        <input
          type="checkbox"
          checked={taxInclusiveInput}
          disabled={taxRateFor(line.taxCategory) === null}
          onChange={(e) => {
            const checked = e.target.checked;
            const rate = taxRateFor(line.taxCategory);
            if (checked && rate !== null) {
              setPreTaxInclusiveValues({ unitPrice: line.unitPrice, amount: line.amount });
              const unitPrice = line.unitPrice !== null ? Math.round(line.unitPrice / (1 + rate)) : null;
              const amount = Math.round(line.amount / (1 + rate));
              onPatch(line.id, { unitPrice, amount });
              onSave({ ...line, unitPrice, amount });
            } else if (!checked && preTaxInclusiveValues) {
              const { unitPrice, amount } = preTaxInclusiveValues;
              onPatch(line.id, { unitPrice, amount });
              onSave({ ...line, unitPrice, amount });
              setPreTaxInclusiveValues(null);
            }
            setTaxInclusiveInput(checked);
          }}
          className="mt-1.5 h-4 w-4 disabled:opacity-30"
          title="打った金額を税込みとして扱い、自動で税抜きに変換します"
        />
      </div>
      <button
        onClick={() => onDelete(line.id)}
        disabled={deleting}
        className="mt-5 flex items-center gap-1 text-[11px] text-red-600 disabled:opacity-50"
      >
        {deleting && <Spinner />}
        削除
      </button>
    </div>
  );
}

export default function InvoiceEditor({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [headerForm, setHeaderForm] = useState({ issueDate: "", periodLabel: "", memo: "" });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [unitOptions, setUnitOptions] = useState<string[]>(DEFAULT_UNIT_OPTIONS);
  const [deductionOptions, setDeductionOptions] = useState<string[]>([]);
  const [taxChargeOptions, setTaxChargeOptions] = useState<string[]>(DEFAULT_TAX_CHARGE_OPTIONS);
  const [taxDeductionOptions, setTaxDeductionOptions] = useState<string[]>(DEFAULT_TAX_DEDUCTION_OPTIONS);
  const [groupOptions, setGroupOptions] = useState<string[]>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [groupPickerCustom, setGroupPickerCustom] = useState(false);
  const [groupPickerValue, setGroupPickerValue] = useState("");
  const [showDailyReports, setShowDailyReports] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function runPending(key: string, fn: () => Promise<void>) {
    setPendingKey(key);
    try {
      await fn();
    } finally {
      setPendingKey((k) => (k === key ? null : k));
    }
  }

  async function load() {
    const res = await fetch(`/api/invoices/${invoiceId}`);
    if (res.ok) {
      const data = await res.json();
      setInvoice(data);
      setHeaderForm({
        issueDate: data.issueDate.slice(0, 10),
        periodLabel: data.periodLabel,
        memo: data.memo || "",
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [invoiceId]);

  useEffect(() => {
    fetch("/api/invoice-options?type=unit")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { name: string }[]) => {
        if (data.length > 0) setUnitOptions(data.map((o) => o.name));
      });
    fetch("/api/invoice-options?type=deduction")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { name: string }[]) => setDeductionOptions(data.map((o) => o.name)));
    fetch("/api/invoice-options?type=tax_charge")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { name: string }[]) => {
        if (data.length > 0) setTaxChargeOptions(data.map((o) => o.name));
      });
    fetch("/api/invoice-options?type=tax_deduction")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { name: string }[]) => {
        if (data.length > 0) setTaxDeductionOptions(data.map((o) => o.name));
      });
    fetch("/api/invoice-options?type=group")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { name: string }[]) => setGroupOptions(data.map((o) => o.name)));
  }, []);

  async function saveHeader() {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(headerForm),
    });
    router.refresh();
  }

  async function createLine(data: Partial<Line> & { section: "charge" | "deduction" }) {
    await fetch(`/api/invoices/${invoiceId}/lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "", amount: 0, ...data }),
    });
    await load();
    router.refresh();
  }

  async function confirmAddGroupedLine() {
    const groupLabel = groupPickerValue.trim();
    if (!groupLabel) return;
    await runPending("add-grouped", async () => {
      await createLine({ section: "charge", groupLabel });
      setShowGroupPicker(false);
      setGroupPickerCustom(false);
      setGroupPickerValue("");
      setShowAddMenu(false);
    });
  }

  async function addUngroupedLine() {
    await runPending("add-ungrouped", async () => {
      await createLine({ section: "charge", groupLabel: null });
      setShowAddMenu(false);
    });
  }

  async function addLineToGroup(groupLabel: string) {
    await runPending(`add-to-group-${groupLabel}`, async () => {
      await createLine({ section: "charge", groupLabel });
    });
  }

  async function addDeductionLine() {
    await runPending("add-deduction", async () => {
      await createLine({ section: "deduction" });
    });
  }

  async function deleteGroup(groupLabel: string) {
    if (!invoice) return;
    if (!confirm(`「${groupLabel}」のグループごと削除しますか？`)) return;
    await runPending(`delete-group-${groupLabel}`, async () => {
      const targets = invoice.lines.filter((l) => l.groupLabel === groupLabel);
      for (const line of targets) {
        await fetch(`/api/invoices/${invoiceId}/lines/${line.id}`, { method: "DELETE" });
      }
      await load();
      router.refresh();
    });
  }

  async function renameGroup(oldLabel: string, newLabel: string) {
    if (!invoice || oldLabel === newLabel) return;
    const targets = invoice.lines.filter((l) => l.groupLabel === oldLabel);
    for (const line of targets) {
      await saveLine({ ...line, groupLabel: newLabel });
    }
    await load();
  }

  async function saveLine(line: Line) {
    await fetch(`/api/invoices/${invoiceId}/lines/${line.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(line),
    });
    router.refresh();
  }

  async function deleteLine(lineId: string) {
    if (!confirm("この行を削除しますか？")) return;
    await runPending(`delete-line-${lineId}`, async () => {
      await fetch(`/api/invoices/${invoiceId}/lines/${lineId}`, { method: "DELETE" });
      await load();
      router.refresh();
    });
  }

  function patchLine(lineId: string, patch: Partial<Line>) {
    setInvoice((prev) =>
      prev
        ? { ...prev, lines: prev.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) }
        : prev
    );
  }

  if (loading) return <p>読み込み中...</p>;
  if (!invoice) return <p>見つかりません</p>;

  const chargeLines = invoice.lines.filter((l) => l.section !== "deduction");
  const deductionLines = invoice.lines.filter((l) => l.section === "deduction");
  const chargeTotal = chargeLines.reduce((s, l) => s + l.amount, 0);
  const deductionTotal = deductionLines.reduce((s, l) => s + l.amount, 0);
  const { tax: chargeTax } = calcConsumptionTax(chargeLines);
  const { tax: deductionTax } = calcConsumptionTax(deductionLines);
  const chargeGrandTotal = chargeTotal + chargeTax;
  const deductionGrandTotal = deductionTotal + deductionTax;
  const total = chargeGrandTotal - deductionGrandTotal;

  const groupOrder: string[] = [];
  const groupedLines = new Map<string, Line[]>();
  const ungroupedLines: Line[] = [];
  for (const line of chargeLines) {
    if (line.groupLabel) {
      if (!groupedLines.has(line.groupLabel)) {
        groupedLines.set(line.groupLabel, []);
        groupOrder.push(line.groupLabel);
      }
      groupedLines.get(line.groupLabel)!.push(line);
    } else {
      ungroupedLines.push(line);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <PdfDownloadButton
          href={`/api/invoices/${invoiceId}/pdf`}
          label="PDFプレビュー"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        />
        <button
          onClick={() => setShowDailyReports((v) => !v)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          {showDailyReports ? "日報を閉じる" : "日報を確認する"}
        </button>
      </div>

      <div className={showDailyReports ? "grid gap-4 lg:grid-cols-2 lg:items-start" : ""}>
        {showDailyReports && (
          <div className="lg:sticky lg:top-4">
            <InvoiceDailyReportPanel
              contractorName={invoice.contractor.name}
              onClose={() => setShowDailyReports(false)}
            />
          </div>
        )}
        <div className="space-y-6">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm text-slate-500">請求先：{invoice.contractor.name}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">発行日</label>
            <input
              type="date"
              value={headerForm.issueDate}
              onChange={(e) => setHeaderForm({ ...headerForm, issueDate: e.target.value })}
              onBlur={saveHeader}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">対象期間の表記</label>
            <input
              value={headerForm.periodLabel}
              onChange={(e) => setHeaderForm({ ...headerForm, periodLabel: e.target.value })}
              onBlur={saveHeader}
              placeholder="例：令和8年6月分"
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="relative mb-3 flex items-center justify-between">
          <h3 className="font-semibold">請求項目</h3>
          <div className="relative">
            <button
              onClick={() => {
                setShowAddMenu((v) => !v);
                setShowGroupPicker(false);
                setGroupPickerCustom(false);
                setGroupPickerValue("");
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              + 項目を追加
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-6 z-10 w-64 rounded-lg border bg-white p-3 shadow-lg">
                {showGroupPicker ? (
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-600">グループ名を選択</p>
                    {groupPickerCustom || groupOptions.length === 0 ? (
                      <input
                        autoFocus
                        value={groupPickerValue}
                        onChange={(e) => setGroupPickerValue(e.target.value)}
                        placeholder="例：①労務費"
                        className="mb-2 w-full rounded border px-2 py-1 text-sm"
                      />
                    ) : (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setGroupPickerCustom(true);
                            setGroupPickerValue("");
                          } else {
                            setGroupPickerValue(e.target.value);
                          }
                        }}
                        className="mb-2 w-full rounded border px-2 py-1 text-sm"
                      >
                        <option value="">選択してください</option>
                        {groupOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        <option value="__custom__">直接入力する</option>
                      </select>
                    )}
                    {groupPickerCustom && groupOptions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setGroupPickerCustom(false);
                          setGroupPickerValue("");
                        }}
                        className="mb-2 block text-[11px] text-blue-600 hover:underline"
                      >
                        一覧から選ぶ
                      </button>
                    )}
                    {!groupPickerCustom && groupPickerValue && (
                      <p className="mb-2 text-xs text-slate-500">選択中：{groupPickerValue}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowGroupPicker(false);
                          setGroupPickerCustom(false);
                          setGroupPickerValue("");
                        }}
                        className="rounded px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={confirmAddGroupedLine}
                        disabled={!groupPickerValue.trim() || pendingKey === "add-grouped"}
                        className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {pendingKey === "add-grouped" && <Spinner />}
                        追加
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowGroupPicker(true)}
                      className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      グループとして追加
                      <span className="block text-xs text-slate-400">①労務費などの見出しをつけて追加</span>
                    </button>
                    <button
                      onClick={addUngroupedLine}
                      disabled={pendingKey === "add-ungrouped"}
                      className="flex w-full items-center gap-1 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                      {pendingKey === "add-ungrouped" && <Spinner />}
                      <span>
                        グループなしで追加
                        <span className="block text-xs text-slate-400">1行だけの請求書向け</span>
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {chargeLines.length === 0 && (
          <p className="text-sm text-slate-500">まだ項目がありません。「＋ 項目を追加」から始めてください。</p>
        )}

        <div className="space-y-3">
          {groupOrder.map((groupLabel) => (
            <div key={groupLabel} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  defaultValue={groupLabel}
                  onBlur={(e) => renameGroup(groupLabel, e.target.value)}
                  className="flex-1 border-b border-dashed border-slate-300 bg-transparent py-1 text-sm font-bold outline-none"
                />
                <button
                  onClick={() => deleteGroup(groupLabel)}
                  disabled={pendingKey === `delete-group-${groupLabel}`}
                  className="flex items-center gap-1 text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  {pendingKey === `delete-group-${groupLabel}` && <Spinner />}
                  グループを削除
                </button>
              </div>
              <div className="overflow-x-auto">
                {groupedLines.get(groupLabel)!.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    showUnit
                    unitOptions={unitOptions}
                    deductionOptions={deductionOptions}
                    taxOptions={taxChargeOptions}
                    onPatch={patchLine}
                    onSave={saveLine}
                    onDelete={deleteLine}
                    deleting={pendingKey === `delete-line-${line.id}`}
                  />
                ))}
              </div>
              <button
                onClick={() => addLineToGroup(groupLabel)}
                disabled={pendingKey === `add-to-group-${groupLabel}`}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
              >
                {pendingKey === `add-to-group-${groupLabel}` && <Spinner />}
                + このグループ内に内容を追加
              </button>
            </div>
          ))}

          {ungroupedLines.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-slate-400">グループなしの項目</p>
              {ungroupedLines.map((line) => (
                <div key={line.id} className="mb-2 overflow-x-auto rounded-lg border p-3">
                  <LineRow
                    line={line}
                    showUnit
                    unitOptions={unitOptions}
                    deductionOptions={deductionOptions}
                    taxOptions={taxChargeOptions}
                    onPatch={patchLine}
                    onSave={saveLine}
                    onDelete={deleteLine}
                    deleting={pendingKey === `delete-line-${line.id}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-3">
          <div className="flex justify-between text-sm">
            <span>小計</span>
            <span>{formatCurrency(chargeTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>消費税(10%)</span>
            <span>{formatCurrency(chargeTax)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span>合計</span>
            <span>{formatCurrency(chargeGrandTotal)}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">控除項目</h3>
          <button
            onClick={addDeductionLine}
            disabled={pendingKey === "add-deduction"}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {pendingKey === "add-deduction" && <Spinner />}
            + 控除を追加
          </button>
        </div>
        {deductionLines.length === 0 ? (
          <p className="text-sm text-slate-500">控除はありません。</p>
        ) : (
          <div className="space-y-2">
            {deductionLines.map((line) => (
              <div key={line.id} className="overflow-x-auto rounded-lg border p-3">
                <LineRow
                  line={line}
                  showUnit={false}
                  unitOptions={unitOptions}
                  deductionOptions={deductionOptions}
                  taxOptions={taxDeductionOptions}
                  onPatch={patchLine}
                  onSave={saveLine}
                  onDelete={deleteLine}
                  deleting={pendingKey === `delete-line-${line.id}`}
                />
              </div>
            ))}
          </div>
        )}

        {deductionLines.length > 0 && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3">
            <div className="flex justify-between text-sm">
              <span>控除小計</span>
              <span>−{formatCurrency(deductionTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>消費税</span>
              <span>−{formatCurrency(deductionTax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>控除合計</span>
              <span>−{formatCurrency(deductionGrandTotal)}</span>
            </div>
          </div>
        )}
      </section>

      <div className="rounded-xl bg-blue-50 p-4">
        <div className="flex justify-between text-lg font-bold">
          <span>ご請求金額</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <label className="mb-1 block text-xs text-slate-500">備考</label>
        <textarea
          value={headerForm.memo}
          onChange={(e) => setHeaderForm({ ...headerForm, memo: e.target.value })}
          onBlur={saveHeader}
          rows={3}
          placeholder="振込手数料は御社にてご負担ください、など"
          className="w-full rounded border px-2 py-1.5 text-sm"
        />
        <p className="mt-1 text-xs text-slate-400">
          入力するとPDFの振込先の下に表示されます。空欄なら何も表示されません。
        </p>
      </div>
        </div>
      </div>
    </div>
  );
}
