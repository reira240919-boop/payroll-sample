import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_DEDUCTION_TEMPLATES = [
  { itemName: "家賃", amount: 0, sortOrder: 0 },
  { itemName: "駐車場代", amount: 0, sortOrder: 1 },
  { itemName: "作業着代", amount: 0, sortOrder: 2 },
];

async function main() {
  await prisma.advanceRepayment.deleteMany();
  await prisma.payslipDeductionLine.deleteMany();
  await prisma.payslipEarningLine.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.dailyReport.deleteMany();
  await prisma.fixedDeductionTemplate.deleteMany();
  await prisma.salaryAdvance.deleteMany();
  await prisma.employee.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const admins = [
    { email: "president@example.com", name: "サンプル 社長", role: "admin" },
    { email: "clerk@example.com", name: "サンプル 事務", role: "admin" },
  ];

  const employees = [
    { email: "emp1@example.com", name: "サンプル 一郎", hourlyRate: 1200 },
    { email: "emp2@example.com", name: "サンプル 次郎", hourlyRate: 1150 },
    { email: "emp3@example.com", name: "サンプル 三郎", hourlyRate: 1100 },
    { email: "emp4@example.com", name: "サンプル 四郎", hourlyRate: 1200 },
    { email: "emp5@example.com", name: "サンプル 五郎", hourlyRate: 1250 },
    { email: "emp6@example.com", name: "サンプル 六郎", hourlyRate: 1180 },
    { email: "emp7@example.com", name: "サンプル 七郎", hourlyRate: 1300 },
  ];

  for (const admin of admins) {
    const emp = await prisma.employee.create({
      data: {
        email: admin.email,
        passwordHash,
        name: admin.name,
        role: admin.role,
        hourlyRate: 0,
        fixedDeductions: { create: DEFAULT_DEDUCTION_TEMPLATES },
      },
    });
    console.log(`Created admin: ${emp.name}`);
  }

  for (const emp of employees) {
    const created = await prisma.employee.create({
      data: {
        email: emp.email,
        passwordHash,
        name: emp.name,
        hourlyRate: emp.hourlyRate,
        role: "employee",
        fixedDeductions: {
          create: DEFAULT_DEDUCTION_TEMPLATES.map((t, i) => ({
            ...t,
            amount: i === 0 ? 30000 : i === 1 ? 5000 : 0,
          })),
        },
      },
    });
    console.log(`Created employee: ${created.name}`);
  }

  console.log("\nSeed complete. Default password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
