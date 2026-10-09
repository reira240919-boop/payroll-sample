import { startOfMonth, endOfMonth, format } from "date-fns";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getEmployeePeriodRange } from "@/lib/payroll";
import DailyReportForm from "@/components/DailyReportForm";
import BackButton from "@/components/BackButton";

type Props = {
  searchParams: Promise<{ date?: string; edit?: string }>;
};

export default async function NewDailyReportPage({ searchParams }: Props) {
  const { date, edit } = await searchParams;
  const session = await getSession();

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    select: { closingDay: true },
  });

  const now = new Date();
  const range = getEmployeePeriodRange(employee?.closingDay, {
    startDate: startOfMonth(now),
    endDate: endOfMonth(now),
  });

  return (
    <div>
      {edit && <BackButton label="日報一覧に戻る" fallbackHref="/employee/daily-reports" />}
      <h2 className="mb-4 text-xl font-bold">日報入力</h2>
      <p className="mb-4 text-sm text-slate-600">
        日付・現場名・作業時間・残業時間を入力してください。
      </p>
      <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-blue-600">今月の集計期間</p>
          <p className="text-base font-semibold text-slate-900">
            {format(range.start, "M月d日")} 〜 {format(range.end, "M月d日")}
          </p>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          {employee?.closingDay ? `${employee.closingDay}日締め` : "月末締め"}
        </span>
      </div>
      <DailyReportForm initialDate={date} initialEditId={edit} />
    </div>
  );
}
