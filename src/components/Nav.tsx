import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import LogoutButton from "./LogoutButton";
import NavLinks from "./NavLinks";

interface NavProps {
  links: { href: string; label: string }[];
}

export default async function Nav({ links }: NavProps) {
  const session = await getSession();
  const employee = session.employeeId
    ? await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { name: true },
      })
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs text-slate-500">サンプル工業</p>
          <h1 className="text-lg font-bold text-slate-900">{employee?.name ?? session.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <LogoutButton />
        </div>
      </div>
      <NavLinks links={links} />
    </header>
  );
}
