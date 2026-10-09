import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireAuth();
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: session.employeeId },
      select: {
        name: true,
        phone: true,
        postalCode: true,
        address: true,
        birthDate: true,
        emergencyContactName: true,
        emergencyContactRelation: true,
        emergencyContactPhone: true,
      },
    });
    return NextResponse.json(employee);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.postalCode !== undefined) data.postalCode = body.postalCode || null;
    if (body.address !== undefined) data.address = body.address || null;
    if (body.birthDate !== undefined) data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
    if (body.emergencyContactName !== undefined)
      data.emergencyContactName = body.emergencyContactName || null;
    if (body.emergencyContactRelation !== undefined)
      data.emergencyContactRelation = body.emergencyContactRelation || null;
    if (body.emergencyContactPhone !== undefined)
      data.emergencyContactPhone = body.emergencyContactPhone || null;

    if (body.password) {
      if (String(body.password).length < 6) {
        return NextResponse.json(
          { error: "パスワードは6文字以上で入力してください" },
          { status: 400 }
        );
      }
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }

    await prisma.employee.update({
      where: { id: session.employeeId },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
