"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DateNavigator from "@/components/DateNavigator";
import Spinner from "@/components/Spinner";
import { DAILY_REPORT_STATUS_LABELS } from "@/lib/constants";
import { todayString } from "@/lib/date-utils";

type DailyReport = {
  id: string;
  date: string;
  siteName: string;
  contractorName: string | null;
  workHours: number;
  overtimeHours: number;
  status: string;
};

type EntryForm = {
  siteName: string;
  contractorName: string;
  workHours: string;
  overtimeHours: string;
};

const emptyEntry = (): EntryForm => ({
  siteName: "",
  contractorName: "",
  workHours: "",
  overtimeHours: "",
});

export default function DailyReportForm({
  initialDate,
  initialEditId,
}: {
  initialDate?: string;
  initialEditId?: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate || todayString());
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [siteNames, setSiteNames] = useState<string[]>([]);
  const [contractors, setContractors] = useState<{ id: string; name: string }[]>([]);
  const [entry, setEntry] = useState<EntryForm>(emptyEntry());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EntryForm>(emptyEntry());
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // どの操作の結果かで表示場所を変える: 新規作成フォーム / 各日報の行 / 一覧の上
  const [feedbackAt, setFeedbackAt] = useState<string>("list");
  const [autoEditConsumedFor, setAutoEditConsumedFor] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    const res = await fetch(`/api/daily-reports?from=${date}&to=${date}`);
    if (res.ok) {
      const data = await res.json();
      setReports(
        data.map((r: DailyReport & { date: string }) => ({
          ...r,
          date: r.date.slice(0, 10),
        }))
      );
    }
    setLoadingReports(false);
  }, [date]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    fetch("/api/site-names")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSiteNames)
      .catch(() => {});
    fetch("/api/contractors")
      .then((res) => (res.ok ? res.json() : []))
      .then(setContractors)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!initialEditId || loadingReports || autoEditConsumedFor === initialEditId) return;
    const match = reports.find((r) => r.id === initialEditId);
    if (match && canEdit(match.status)) {
      startEdit(match);
    }
    setAutoEditConsumedFor(initialEditId);
  }, [initialEditId, loadingReports, reports, autoEditConsumedFor]);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  function canEdit(status: string) {
    return status === "draft" || status === "submitted";
  }

  async function handleCreate(submitAs: "draft" | "submitted") {
    setLoading(true);
    setPendingAction(`create-${submitAs}`);
    setMessage("");
    setError("");
    setFeedbackAt("create");

    const res = await fetch("/api/daily-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        siteName: entry.siteName,
        contractorName: entry.contractorName,
        workHours: parseFloat(entry.workHours) || 0,
        overtimeHours: parseFloat(entry.overtimeHours) || 0,
        status: submitAs,
      }),
    });

    setLoading(false);
    setPendingAction(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "保存に失敗しました");
      return;
    }

    setMessage(submitAs === "submitted" ? "日報を提出しました" : "下書きを保存しました");
    setEntry(emptyEntry());
    await loadReports();
    router.refresh();
  }

  async function handleUpdate(id: string, submitAs: "draft" | "submitted") {
    setLoading(true);
    setPendingAction(`update-${id}-${submitAs}`);
    setMessage("");
    setError("");

    const res = await fetch(`/api/daily-reports/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        siteName: editForm.siteName,
        contractorName: editForm.contractorName,
        workHours: parseFloat(editForm.workHours) || 0,
        overtimeHours: parseFloat(editForm.overtimeHours) || 0,
        status: submitAs,
      }),
    });

    setLoading(false);
    setPendingAction(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "更新に失敗しました");
      setFeedbackAt(`row-${id}`);
      return;
    }

    setFeedbackAt("list");
    setMessage("日報を更新しました");
    setEditingId(null);
    await loadReports();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("この日報を削除しますか？")) return;

    setLoading(true);
    setPendingAction(`delete-${id}`);
    setError("");

    const res = await fetch(`/api/daily-reports/${id}`, { method: "DELETE" });
    setLoading(false);
    setPendingAction(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "削除に失敗しました");
      setFeedbackAt(`row-${id}`);
      return;
    }

    setFeedbackAt("list");
    setMessage("日報を削除しました");
    setEditingId(null);
    await loadReports();
    router.refresh();
  }

  function startEdit(report: DailyReport) {
    setEditingId(report.id);
    setEditForm({
      siteName: report.siteName,
      contractorName: report.contractorName || "",
      workHours: String(report.workHours),
      overtimeHours: String(report.overtimeHours),
    });
    setMessage("");
    setError("");
  }

  const feedback = (
    <>
      {message && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <datalist id="site-name-options">
        {siteNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <DateNavigator date={date} onChange={setDate} />

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-800">この日の日報</h3>
        {feedbackAt === "list" && <div className="mb-3 space-y-2">{feedback}</div>}
        {loadingReports ? (
          <p className="text-sm text-slate-500">読み込み中...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-slate-500">まだ日報がありません。下のフォームから入力してください。</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border border-slate-200 p-3">
                {editingId === report.id ? (
                  <div className="space-y-3">
                    <select
                      value={editForm.contractorName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, contractorName: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      required
                    >
                      <option value="">元請け会社を選択</option>
                      {contractors.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editForm.siteName}
                      onChange={(e) => setEditForm({ ...editForm, siteName: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="現場名"
                      list="site-name-options"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editForm.workHours}
                        onChange={(e) => setEditForm({ ...editForm, workHours: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        placeholder="作業時間"
                      />
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editForm.overtimeHours}
                        onChange={(e) => setEditForm({ ...editForm, overtimeHours: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        placeholder="残業時間"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleUpdate(report.id, "submitted")}
                        className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {pendingAction === `update-${report.id}-submitted` && <Spinner />}
                        提出する
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleUpdate(report.id, "draft")}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                      >
                        {pendingAction === `update-${report.id}-draft` && <Spinner />}
                        下書き保存
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setEditingId(null)}
                        className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleDelete(report.id)}
                        className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {pendingAction === `delete-${report.id}` && <Spinner />}
                        削除
                      </button>
                    </div>
                    {feedbackAt === `row-${report.id}` && feedback}
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{report.siteName}</p>
                      {report.contractorName && (
                        <p className="text-xs text-slate-500">元請け: {report.contractorName}</p>
                      )}
                      <p className="mt-1 text-sm text-slate-600">
                        作業 {report.workHours}h / 残業 {report.overtimeHours}h
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          report.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : report.status === "submitted"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {DAILY_REPORT_STATUS_LABELS[report.status] || report.status}
                      </span>
                      {canEdit(report.status) && (
                        <button
                          type="button"
                          onClick={() => startEdit(report)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          修正
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-1 font-semibold text-slate-800">現場を追加</h3>
        <p className="mb-4 text-sm text-slate-500">
          同一日に複数現場がある場合は、現場ごとに入力してください。
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate("submitted");
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">元請け会社</label>
            <select
              value={entry.contractorName}
              onChange={(e) => setEntry({ ...entry, contractorName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              required
            >
              <option value="">元請け会社を選択</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">現場名</label>
            <input
              type="text"
              value={entry.siteName}
              onChange={(e) => setEntry({ ...entry, siteName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              placeholder="例：〇〇ビル新築工事"
              list="site-name-options"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">作業時間（h）</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={entry.workHours}
                onChange={(e) => setEntry({ ...entry, workHours: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">残業時間（h）</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={entry.overtimeHours}
                onChange={(e) => setEntry({ ...entry, overtimeHours: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pendingAction === "create-submitted" && <Spinner />}
              {loading ? "保存中..." : "提出する"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleCreate("draft")}
              className="flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-3 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {pendingAction === "create-draft" && <Spinner />}
              下書き
            </button>
          </div>
          {feedbackAt === "create" && feedback}
        </form>
      </section>
    </div>
  );
}
