import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { DEFAULT_DEDUCTION_TEMPLATES } from "@/lib/constants";
import { getDefaultPassword } from "@/lib/settings";

export async function GET() {
  try {
    await requireAdmin();
    const employees = await prisma.employee.findMany({
      include: {
        fixedDeductions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { dailyReports: true, payslips: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(employees);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { email, password, name, hourlyRate, overtimeMultiplier, role } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password || (await getDefaultPassword()), 10);

    const employee = await prisma.employee.create({
      data: {
        email: email || null,
        passwordHash,
        name,
        hourlyRate: Number(hourlyRate) || 0,
        overtimeMultiplier: Number(overtimeMultiplier) || 1.25,
        role: role || "employee",
        needsSetup: true,
        fixedDeductions: {
          create: DEFAULT_DEDUCTION_TEMPLATES.map((t) => ({
            itemName: t.itemName,
            amount: 0,
            sortOrder: t.sortOrder,
          })),
        },
      },
      include: { fixedDeductions: true },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "その名前の従業員はすでに登録されています" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
