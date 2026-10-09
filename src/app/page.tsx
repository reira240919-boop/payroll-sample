import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }
  redirect(session.role === "admin" ? "/admin/daily-reports" : "/employee/daily-reports/new");
}
