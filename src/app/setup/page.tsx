import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import SetupForm from "@/components/SetupForm";

export default async function SetupPage() {
  const session = await requireAuth();
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: session.employeeId } });

  if (!employee.needsSetup) {
    redirect(employee.role === "admin" ? "/admin/daily-reports" : "/employee/daily-reports/new");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs text-slate-500">サンプル工業</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">初回ログインの設定</h1>
          <p className="mt-2 text-sm text-slate-600">
            入力は初回ログイン時だけで、次回からは表示されません。
          </p>
        </div>
        <SetupForm
          name={employee.name}
          isAdmin={employee.role === "admin"}
          initial={{
            phone: employee.phone || "",
            postalCode: employee.postalCode || "",
            address: employee.address || "",
            birthDate: employee.birthDate ? employee.birthDate.toISOString().slice(0, 10) : "",
            emergencyContactName: employee.emergencyContactName || "",
            emergencyContactRelation: employee.emergencyContactRelation || "",
            emergencyContactPhone: employee.emergencyContactPhone || "",
          }}
        />
      </div>
    </div>
  );
}
