import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function TransferAmountsPage() {
  const periods = await prisma.payrollPeriod.findMany({
    where: { payslips: { some: { status: "approved" } } },
    include: {
      _count: { select: { payslips: { where: { status: "approved" } } } },
    },
    orderBy: { startDate: "desc" },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">振込金額一覧</h2>
        <div className="flex flex-col items-end gap-2">
          <Link href="/admin/invoices" className="text-sm text-blue-600 hover:underline">
            請求書はこちら →
          </Link>
          <Link
            href="/admin/transfer-amounts/settings"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            設定
          </Link>
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        確定済みの明細がある月だけ表示されます。月を選ぶと、振込日ごとの金額一覧に進みます。
      </p>
      <div className="space-y-2">
        {periods.length === 0 && (
          <p className="text-sm text-slate-500">確定済みの明細がまだありません。</p>
        )}
        {periods.map((period) => {
          const label = `${period.startDate.getFullYear()}年${period.startDate.getMonth() + 1}月`;
          return (
            <Link
              key={period.id}
              href={`/admin/transfer-amounts/${period.id}`}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm hover:bg-slate-50"
            >
              <div>
                <p className="font-semibold text-slate-900">{label}</p>
                <p className="text-sm text-slate-500">確定済み {period._count.payslips}名</p>
              </div>
              <span className="text-slate-400">›</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
