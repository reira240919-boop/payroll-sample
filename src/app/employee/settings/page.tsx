import { requirePageAuth } from "@/lib/auth-page";
import { prisma } from "@/lib/db";
import EmployeeSettingsForm from "@/components/EmployeeSettingsForm";

export default async function EmployeeSettingsPage() {
  const session = await requirePageAuth("employee");
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: session.employeeId } });

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-1 text-xl font-bold">設定</h2>
      <p className="mb-6 text-sm text-slate-600">連絡先・緊急連絡先の変更、パスワードの変更ができます。</p>
      <EmployeeSettingsForm
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
  );
}
