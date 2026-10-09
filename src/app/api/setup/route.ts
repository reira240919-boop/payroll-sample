import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    if (!body.password || String(body.password).length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上で入力してください" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    if (session.role === "admin") {
      if (!body.name || !String(body.name).trim()) {
        return NextResponse.json({ error: "お名前を入力してください" }, { status: 400 });
      }

      const employee = await prisma.employee.update({
        where: { id: session.employeeId },
        data: { name: body.name, passwordHash, needsSetup: false },
      });

      return NextResponse.json({ role: employee.role });
    }

    const REQUIRED_FIELDS: [string, string][] = [
      ["phone", "電話番号"],
      ["postalCode", "郵便番号"],
      ["address", "ご住所"],
      ["birthDate", "生年月日"],
      ["emergencyContactName", "緊急連絡先のお名前"],
      ["emergencyContactRelation", "緊急連絡先の続柄"],
      ["emergencyContactPhone", "緊急連絡先の電話番号"],
    ];
    for (const [field, label] of REQUIRED_FIELDS) {
      if (!body[field] || !String(body[field]).trim()) {
        return NextResponse.json({ error: `${label}を入力してください` }, { status: 400 });
      }
    }

    const employee = await prisma.employee.update({
      where: { id: session.employeeId },
      data: {
        phone: body.phone || null,
        postalCode: body.postalCode || null,
        address: body.address || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        emergencyContactName: body.emergencyContactName || null,
        emergencyContactRelation: body.emergencyContactRelation || null,
        emergencyContactPhone: body.emergencyContactPhone || null,
        passwordHash,
        needsSetup: false,
      },
    });

    return NextResponse.json({ role: employee.role });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "その名前はすでに使われています" }, { status: 409 });
    }
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
