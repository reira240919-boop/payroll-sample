import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { getCompanyInfo, getPresidentEmail, getTransferNoticeMailTemplate } from "@/lib/settings";

export const UNSET_PAYDAY = "未設定";

// 同じ締め期間・同じ振込日の「振込」（手渡し以外）の確定済み明細
export async function getBankTransferGroup(periodId: string, payday: string) {
  const payslips = await prisma.payslip.findMany({
    where: { payrollPeriodId: periodId, status: "approved" },
    include: { employee: { select: { payday: true, paymentMethod: true } } },
  });
  return payslips.filter(
    (p) => (p.employee.payday || UNSET_PAYDAY) === payday && p.employee.paymentMethod !== "手渡し"
  );
}

function fillTransferNoticeTemplate(
  template: string,
  vars: { 会社名: string; 期間: string; 振込日: string }
) {
  return template
    .replaceAll("{会社名}", vars.会社名)
    .replaceAll("{期間}", vars.期間)
    .replaceAll("{振込日}", vars.振込日);
}

export type TransferNoticeResult =
  | { status: "sent"; sentAt: Date }
  | { status: "already_sent"; sentAt: Date }
  | { status: "incomplete" }
  | { status: "no_email" }
  | { status: "failed" };

// 振込の人が全員チェック済みで、まだ送っていなければ社長に振込完了メールを1通送る
export async function sendTransferNoticeIfComplete(
  periodId: string,
  payday: string
): Promise<TransferNoticeResult> {
  const group = await getBankTransferGroup(periodId, payday);
  if (group.length === 0 || group.some((p) => !p.transferConfirmed)) {
    return { status: "incomplete" };
  }

  const alreadySent = group.find((p) => p.transferNoticeSentAt);
  if (alreadySent?.transferNoticeSentAt) {
    return { status: "already_sent", sentAt: alreadySent.transferNoticeSentAt };
  }

  const to = await getPresidentEmail();
  if (!to) return { status: "no_email" };

  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) return { status: "failed" };

  const [companyInfo, template] = await Promise.all([
    getCompanyInfo(),
    getTransferNoticeMailTemplate(),
  ]);
  const vars = {
    会社名: companyInfo.name,
    期間: `${period.startDate.getFullYear()}年${period.startDate.getMonth() + 1}月`,
    振込日: payday === UNSET_PAYDAY ? "振込日未設定" : `${payday}振込分`,
  };

  // 先に「送信済み」を記録してからメールを送る。記録できなかったときは送らないので、
  // メールが届いたのに未送信扱いになって二重に送る、ということが起きない。
  // 同時に2回呼ばれても、記録できるのは先に来た1回だけ（未送信の行だけを更新するため）。
  const groupIds = group.map((p) => p.id);
  const sentAt = new Date();
  const claimed = await prisma.payslip.updateMany({
    where: { id: { in: groupIds }, transferNoticeSentAt: null },
    data: { transferNoticeSentAt: sentAt },
  });
  if (claimed.count === 0) {
    return { status: "already_sent", sentAt };
  }

  try {
    await sendMail({
      to,
      subject: fillTransferNoticeTemplate(template.subject, vars),
      text: fillTransferNoticeTemplate(template.body, vars),
    });
  } catch (e) {
    console.error(e);
    // 送れなかったので記録を取り消し、画面の「送る」ボタンから送り直せるようにする
    await prisma.payslip.updateMany({
      where: { id: { in: groupIds }, transferNoticeSentAt: sentAt },
      data: { transferNoticeSentAt: null },
    });
    return { status: "failed" };
  }

  return { status: "sent", sentAt };
}
