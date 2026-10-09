import { headers } from "next/headers";
import { getCompanyInfo } from "@/lib/settings";
import CompanyInfoForm from "@/components/CompanyInfoForm";
import ContractorManager from "@/components/ContractorManager";
import PaydayOptionManager from "@/components/PaydayOptionManager";

export default async function AdminCompanyInfoPage() {
  const info = await getCompanyInfo();
  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = host ? `${protocol}://${host}` : "";
  const loginUrl = `${baseUrl}/login`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-xl font-bold">会社情報</h2>
        <p className="mb-4 text-sm text-slate-600">
          会社名・住所・電話・FAXなどの基本情報です。給与明細・請求書PDFで使用します。
        </p>
        <CompanyInfoForm initial={info} />
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-1 font-semibold">サイトURL</h3>
        <p className="mb-4 text-sm text-slate-600">
          従業員・管理者、共通のログインURLです。初めてログインする方は、共通パスワードでログイン後、自動でパスワード設定画面に案内されます。
        </p>
        <a
          href={loginUrl}
          target="_blank"
          rel="noreferrer"
          className="block w-full break-all rounded-lg border bg-slate-50 px-3 py-2 text-sm text-blue-700 hover:underline"
        >
          {loginUrl}
        </a>
      </div>
      <ContractorManager />
      <PaydayOptionManager />
    </div>
  );
}
