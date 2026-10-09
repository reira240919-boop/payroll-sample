"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

interface Employee {
  id: string;
  name: string;
}

export default function SalaryAdvanceForm({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [loanDate, setLoanDate] = useState(new Date().toISOString().slice(0, 10));
  const [loanAmount, setLoanAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/salary-advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        loanDate,
        loanAmount: parseFloat(loanAmount) || 0,
        memo,
      }),
    });
    setLoading(false);
    setLoanAmount("");
    setMemo("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold">前払い登録</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm">従業員</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm">貸付日</label>
          <input
            type="date"
            value={loanDate}
            onChange={(e) => setLoanDate(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm">貸付額（円）</label>
          <input
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="text-sm">メモ</label>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-4 flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading && <Spinner />}
        登録
      </button>
    </form>
  );
}
