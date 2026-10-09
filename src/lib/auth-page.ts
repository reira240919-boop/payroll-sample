import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function requirePageAuth(role?: "admin" | "employee") {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login?reason=session");
  }
  if (role === "admin" && session.role !== "admin") {
    redirect("/employee/daily-reports");
  }
  if (role === "employee" && session.role === "admin") {
    redirect("/admin/daily-reports");
  }
  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { needsSetup: true },
  });
  if (employee?.needsSetup) {
    redirect("/setup");
  }
  return session;
}
