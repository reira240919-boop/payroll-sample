import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        fixedDeductions: { orderBy: { sortOrder: "asc" } },
        fixedAllowances: { orderBy: { sortOrder: "asc" } },
        salaryAdvances: { where: { balance: { gt: 0 } } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.hourlyRate !== undefined) data.hourlyRate = Number(body.hourlyRate);
    if (body.overtimeMultiplier !== undefined) data.overtimeMultiplier = Number(body.overtimeMultiplier);
    if (body.closingDay !== undefined) data.closingDay = body.closingDay === null ? null : Number(body.closingDay);
    if (body.payday !== undefined) data.payday = body.payday || null;
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod || "振込";
    if (body.role !== undefined) data.role = body.role;
    if (body.active !== undefined) data.active = body.active;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.postalCode !== undefined) data.postalCode = body.postalCode || null;
    if (body.address !== undefined) data.address = body.address || null;
    if (body.birthDate !== undefined) data.birthDate = body.birthDate ? new Date(body.birthDate) : null;
    if (body.emergencyContactName !== undefined) data.emergencyContactName = body.emergencyContactName || null;
    if (body.emergencyContactRelation !== undefined)
      data.emergencyContactRelation = body.emergencyContactRelation || null;
    if (body.emergencyContactPhone !== undefined)
      data.emergencyContactPhone = body.emergencyContactPhone || null;
    if (body.invoiceRegistrationNumber !== undefined)
      data.invoiceRegistrationNumber = body.invoiceRegistrationNumber || null;
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const employee = await prisma.employee.update({
      where: { id },
      data,
      include: { fixedDeductions: { orderBy: { sortOrder: "asc" } } },
    });

    if (body.fixedAllowances && Array.isArray(body.fixedAllowances)) {
      const existing = await prisma.fixedAllowanceTemplate.findMany({
        where: { employeeId: id },
        select: { id: true },
      });
      const submittedIds = new Set(
        body.fixedAllowances
          .map((fa: { id?: string }) => fa.id)
          .filter((faId: string | undefined): faId is string => !!faId && !faId.startsWith("new-"))
      );
      const toDelete = existing.filter((e) => !submittedIds.has(e.id));
      if (toDelete.length > 0) {
        await prisma.fixedAllowanceTemplate.deleteMany({
          where: { id: { in: toDelete.map((e) => e.id) } },
        });
      }

      for (const [index, fa] of body.fixedAllowances.entries()) {
        if (fa.id && !fa.id.startsWith("new-")) {
          await prisma.fixedAllowanceTemplate.update({
            where: { id: fa.id },
            data: {
              itemName: fa.itemName,
              amount: Number(fa.amount) || 0,
              taxable: fa.taxable !== undefined ? Boolean(fa.taxable) : true,
              sortOrder: fa.sortOrder ?? index,
            },
          });
        } else {
          await prisma.fixedAllowanceTemplate.create({
            data: {
              employeeId: id,
              itemName: fa.itemName,
              amount: Number(fa.amount) || 0,
              taxable: fa.taxable !== undefined ? Boolean(fa.taxable) : true,
              sortOrder: fa.sortOrder ?? index,
            },
          });
        }
      }
    }

    if (body.fixedDeductions && Array.isArray(body.fixedDeductions)) {
      const existing = await prisma.fixedDeductionTemplate.findMany({
        where: { employeeId: id },
        select: { id: true },
      });
      const submittedIds = new Set(
        body.fixedDeductions
          .map((fd: { id?: string }) => fd.id)
          .filter((fdId: string | undefined): fdId is string => !!fdId && !fdId.startsWith("new-"))
      );
      const toDelete = existing.filter((e) => !submittedIds.has(e.id));
      if (toDelete.length > 0) {
        await prisma.fixedDeductionTemplate.deleteMany({
          where: { id: { in: toDelete.map((e) => e.id) } },
        });
      }

      for (const [index, fd] of body.fixedDeductions.entries()) {
        if (fd.id && !fd.id.startsWith("new-")) {
          await prisma.fixedDeductionTemplate.update({
            where: { id: fd.id },
            data: {
              itemName: fd.itemName,
              amount: Number(fd.amount) || 0,
              sortOrder: fd.sortOrder ?? index,
            },
          });
        } else {
          await prisma.fixedDeductionTemplate.create({
            data: {
              employeeId: id,
              itemName: fd.itemName,
              amount: Number(fd.amount) || 0,
              sortOrder: fd.sortOrder ?? index,
            },
          });
        }
      }
    }

    const updated = await prisma.employee.findUnique({
      where: { id },
      include: {
        fixedDeductions: { orderBy: { sortOrder: "asc" } },
        fixedAllowances: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      const target = (e as { meta?: { target?: string[] } }).meta?.target || [];
      const field = target.includes("name") ? "その名前" : "そのメールアドレス";
      return NextResponse.json(
        { error: `${field}は既に他の従業員で使用されています` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: `更新に失敗しました（${msg}）` }, { status: 500 });
  }
}
