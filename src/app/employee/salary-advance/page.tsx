import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/payroll";

type TimelineEvent = {
  type: "loan" | "repay";
  date: Date;
  amount: number;
  memo: string | null;
  balanceAfter: number;
};

export default async function EmployeeSalaryAdvancePage() {
  const session = await getSession();

  const advances = await prisma.salaryAdvance.findMany({
    where: { employeeId: session.employeeId },
    include: { repayments: true },
  });

  if (advances.length === 0) {
    notFound();
  }

  const totalBalance = advances.reduce((s, a) => s + a.balance, 0);

  const raw: { type: "loan" | "repay"; date: Date; amount: number; memo: string | null }[] = [];
  for (const advance of advances) {
    raw.push({ type: "loan", date: advance.loanDate, amount: advance.loanAmount, memo: advance.memo });
    for (const repayment of advance.repayments) {
      raw.push({ type: "repay", date: repayment.repaidAt, amount: repayment.amount, memo: repayment.memo });
    }
  }
  raw.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const events: TimelineEvent[] = raw.map((e) => {
    running += e.type === "loan" ? e.amount : -e.amount;
    return { ...e, balanceAfter: running };
  });
  events.reverse();

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">前払い</h2>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          現在の残高
        </p>
        <p className="text-2xl font-extrabold tabular-nums text-orange-700">
          {formatCurrency(totalBalance)}
        </p>
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">履歴</p>
      <div className="space-y-2">
        {events.map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                e.type === "loan"
                  ? "bg-orange-50 text-orange-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {e.type === "loan" ? "借入" : "返済"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-600">{formatDate(e.date)}</p>
              {e.memo && <p className="truncate text-xs text-slate-400">{e.memo}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p
                className={`text-sm font-bold tabular-nums ${
                  e.type === "loan" ? "text-orange-700" : "text-green-700"
                }`}
              >
                {e.type === "loan" ? "+" : "−"}
                {formatCurrency(e.amount)}
              </p>
              <p className="text-[10px] text-slate-400 tabular-nums">
                残高 {formatCurrency(e.balanceAfter)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
