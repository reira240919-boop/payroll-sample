import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/payroll";
import { getDefaultPassword } from "@/lib/settings";
import AddEmployeeForm from "@/components/AddEmployeeForm";
import DefaultPasswordSetting from "@/components/DefaultPasswordSetting";

export default async function AdminEmployeesPage() {
  const [employees, defaultPassword] = await Promise.all([
    prisma.employee.findMany({
      include: {
        fixedDeductions: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    getDefaultPassword(),
  ]);

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">従業員マスタ</h2>
      <p className="mb-4 text-sm text-slate-600">
        時給・残業倍率・固定控除（家賃・駐車場代・作業着代・その他）を設定します。
      </p>
      <DefaultPasswordSetting initialValue={defaultPassword} />
      <AddEmployeeForm />
      <div className="space-y-3">
        {employees.map((emp) => (
          <Link
            key={emp.id}
            href={`/admin/employees/${emp.id}`}
            className="block rounded-xl bg-white p-4 shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {emp.name}
                  {emp.needsSetup && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      初回登録待ち
                    </span>
                  )}
                </p>
                {emp.email && <p className="text-sm text-slate-600">{emp.email}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm">
                  {emp.role === "admin" ? "管理者" : `時給 ${formatCurrency(emp.hourlyRate)}`}
                </p>
                <p className="text-xs text-slate-500">
                  残業 {emp.overtimeMultiplier}倍
                </p>
              </div>
            </div>
            {emp.fixedDeductions.filter((d) => d.amount > 0).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {emp.fixedDeductions
                  .filter((d) => d.amount > 0)
                  .map((d) => (
                    <span key={d.id} className="rounded bg-slate-100 px-2 py-1 text-xs">
                      {d.itemName}: {formatCurrency(d.amount)}
                    </span>
                  ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
