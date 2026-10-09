import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import EmployeeEditForm from "@/components/EmployeeEditForm";
import BackButton from "@/components/BackButton";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEmployeeDetailPage({ params }: Props) {
  const { id } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      fixedDeductions: { orderBy: { sortOrder: "asc" } },
      fixedAllowances: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!employee) notFound();

  return (
    <div>
      <BackButton label="一覧に戻る" fallbackHref="/admin/employees" />
      <h2 className="mb-4 text-xl font-bold">{employee.name}</h2>
      <EmployeeEditForm employee={employee} />
    </div>
  );
}
