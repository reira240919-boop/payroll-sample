import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDefaultPassword } from "@/lib/settings";
import LoginForm from "@/components/LoginForm";

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await getSession();
  if (session.isLoggedIn) {
    redirect(session.role === "admin" ? "/admin/daily-reports" : "/employee/daily-reports/new");
  }

  const { reason } = await searchParams;

  const [employees, defaultPassword] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true },
      select: { name: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    getDefaultPassword(),
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">サンプル工業</h1>
          <p className="mt-2 text-slate-600">日報・給与明細システム</p>
        </div>
        {reason === "session" && (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ログイン状態が確認できませんでした。お使いのブラウザでCookieがブロックされていないか確認のうえ、もう一度ログインしてください。
          </div>
        )}
        <LoginForm names={employees.map((e) => e.name)} />
        <p className="mt-6 text-center text-xs text-slate-400">
          初期パスワード: {defaultPassword}
        </p>
      </div>
    </div>
  );
}
