"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

interface Employee {
  id: string;
  name: string;
}

interface Report {
  id: string;
  date: string | Date;
  siteName: string;
  contractorName?: string | null;
  workHours: number;
  overtimeHours: number;
  status: string;
  employeeId: string;
}

interface Props {
  employees: Employee[];
  report?: Report;
  compact?: boolean;
}

export default function AdminDailyReportActions({ employees, report, compact }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [siteNames, setSiteNames] = useState<string[]>([]);
  const [contractors, setContractors] = useState<{ id: string; name: string }[]>([]);

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

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    employeeId: employees[0]?.id || "",
    date: report ? new Date(report.date).toISOString().slice(0, 10) : today,
    siteName: report?.siteName || "",
    contractorName: report?.contractorName || "",
    workHours: report?.workHours?.toString() || "",
    overtimeHours: report?.overtimeHours?.toString() || "0",
    status: report?.status || "submitted",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/daily-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        workHours: parseFloat(form.workHours) || 0,
        overtimeHours: parseFloat(form.overtimeHours) || 0,
      }),
    });
    setLoading(false);
    setShowForm(false);
    router.refresh();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!report) return;
    setLoading(true);
    await fetch(`/api/daily-reports/${report.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        workHours: parseFloat(form.workHours) || 0,
        overtimeHours: parseFloat(form.overtimeHours) || 0,
      }),
    });
    setLoading(false);
    setShowEdit(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!report || !confirm("この日報を削除しますか？")) return;
    setDeleting(true);
    await fetch(`/api/daily-reports/${report.id}`, { method: "DELETE" });
    setDeleting(false);
    router.refresh();
  }

  if (compact && report) {
    return (
      <div className="flex gap-1">
        <button
          onClick={() => setShowEdit(!showEdit)}
          className="text-blue-600 hover:underline"
        >
          編集
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1 text-red-600 hover:underline disabled:opacity-50"
        >
          {deleting && <Spinner />}
          削除
        </button>
        {showEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <form
              onSubmit={handleUpdate}
              className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6"
            >
              <h3 className="mb-4 font-bold">日報編集</h3>
              <ReportFields
                form={form}
                setForm={setForm}
                employees={employees}
                siteNames={siteNames}
                contractors={contractors}
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  {loading && <Spinner />}
                  保存
                </button>
                <button type="button" onClick={() => setShowEdit(false)} className="rounded-lg border px-4 py-2">
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  if (compact) return null;

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + 日報を追加
      </button>
      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">新規日報</h3>
          <ReportFields
            form={form}
            setForm={setForm}
            employees={employees}
            siteNames={siteNames}
            contractors={contractors}
          />
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading && <Spinner />}
              追加
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2">
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ReportFields({
  form,
  setForm,
  employees,
  siteNames,
  contractors,
}: {
  form: {
    employeeId: string;
    date: string;
    siteName: string;
    contractorName: string;
    workHours: string;
    overtimeHours: string;
    status: string;
  };
  setForm: Dispatch<
    SetStateAction<{
      employeeId: string;
      date: string;
      siteName: string;
      contractorName: string;
      workHours: string;
      overtimeHours: string;
      status: string;
    }>
  >;
  employees: Employee[];
  siteNames: string[];
  contractors: { id: string; name: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <datalist id="admin-site-name-options">
        {siteNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <div>
        <label className="text-sm">従業員</label>
        <select
          value={form.employeeId}
          onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm">日付</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm">元請け会社</label>
        <select
          value={form.contractorName}
          onChange={(e) => setForm({ ...form, contractorName: e.target.value })}
          required
          className="mt-1 w-full rounded-lg border px-3 py-2"
        >
          <option value="">選択してください</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm">現場名</label>
        <input
          value={form.siteName}
          onChange={(e) => setForm({ ...form, siteName: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2"
          list="admin-site-name-options"
        />
      </div>
      <div>
        <label className="text-sm">作業時間</label>
        <input
          type="number"
          step="0.5"
          value={form.workHours}
          onChange={(e) => setForm({ ...form, workHours: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm">残業時間</label>
        <input
          type="number"
          step="0.5"
          value={form.overtimeHours}
          onChange={(e) => setForm({ ...form, overtimeHours: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </div>
      <div>
        <label className="text-sm">状態</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        >
          <option value="draft">下書き</option>
          <option value="submitted">提出済</option>
          <option value="approved">承認済</option>
        </select>
      </div>
    </div>
  );
}
