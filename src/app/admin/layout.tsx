import Nav from "@/components/Nav";
import { requirePageAuth } from "@/lib/auth-page";

const links = [
  { href: "/admin/daily-reports", label: "日報管理" },
  { href: "/admin/employees", label: "従業員マスタ" },
  { href: "/admin/salary-advances", label: "前払い台帳" },
  { href: "/admin/approvals", label: "承認・確定" },
  { href: "/admin/transfer-amounts", label: "入金・振込" },
  { href: "/admin/invoices", label: "請求書" },
  { href: "/admin/company-info", label: "会社情報" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageAuth("admin");

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav links={links} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
