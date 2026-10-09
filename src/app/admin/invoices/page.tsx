import Link from "next/link";
import { prisma } from "@/lib/db";
import BackButton from "@/components/BackButton";

export default async function InvoicesPage() {
  const contractors = await prisma.contractor.findMany({
    include: { _count: { select: { invoices: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <BackButton label="入金・振込に戻る" fallbackHref="/admin/transfer-amounts" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">請求書</h2>
        <Link
          href="/admin/invoices/settings"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          設定
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        元請け会社ごとにフォルダとして分かれています。会社情報画面で登録した元請け会社が一覧に出ます。
      </p>
      <div className="space-y-2">
        {contractors.length === 0 && (
          <p className="text-sm text-slate-500">
            元請け会社がまだ登録されていません。会社情報画面で登録してください。
          </p>
        )}
        {contractors.map((c) => (
          <Link
            key={c.id}
            href={`/admin/invoices/${c.id}`}
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm hover:bg-slate-50"
          >
            <div>
              <p className="font-semibold text-slate-900">{c.name}</p>
              <p className="text-sm text-slate-500">請求書 {c._count.invoices}件</p>
            </div>
            <span className="text-slate-400">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
