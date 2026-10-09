import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { defaultSession } from "@/types/session";

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json(
        { error: "お名前とパスワードを入力してください" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { name },
    });

    if (!employee || !employee.active) {
      return NextResponse.json(
        { error: "お名前またはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, employee.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "お名前またはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.employeeId = employee.id;
    session.email = employee.email ?? "";
    session.name = employee.name;
    session.role = employee.role as "employee" | "admin";
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      role: employee.role,
      name: employee.name,
    });
  } catch {
    return NextResponse.json({ error: "ログインに失敗しました" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  Object.assign(session, defaultSession);
  await session.save();
  return NextResponse.json({ ok: true });
}
