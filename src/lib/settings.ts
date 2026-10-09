import { prisma } from "@/lib/db";

const DEFAULT_PASSWORD_KEY = "defaultPassword";
const DEFAULT_PASSWORD_FALLBACK = "password123";

export async function getDefaultPassword() {
  const setting = await prisma.setting.findUnique({ where: { key: DEFAULT_PASSWORD_KEY } });
  return setting?.value || DEFAULT_PASSWORD_FALLBACK;
}

export async function setDefaultPassword(value: string) {
  return prisma.setting.upsert({
    where: { key: DEFAULT_PASSWORD_KEY },
    update: { value },
    create: { key: DEFAULT_PASSWORD_KEY, value },
  });
}

// 明細の確認依頼・振込完了のお知らせを送る社長のメールアドレス
const PRESIDENT_EMAIL_KEY = "presidentEmail";

export async function getPresidentEmail() {
  const setting = await prisma.setting.findUnique({ where: { key: PRESIDENT_EMAIL_KEY } });
  return setting?.value || "";
}

export async function setPresidentEmail(value: string) {
  return prisma.setting.upsert({
    where: { key: PRESIDENT_EMAIL_KEY },
    update: { value },
    create: { key: PRESIDENT_EMAIL_KEY, value },
  });
}

// 社長への確認メールの初期文面（{会社名}・{期間}・{人数} は送信画面を開いた時に置き換える）
const REVIEW_MAIL_TEMPLATE_KEY = "reviewMailTemplate";

export interface ReviewMailTemplate {
  subject: string;
  body: string;
}

const REVIEW_MAIL_TEMPLATE_FALLBACK: ReviewMailTemplate = {
  subject: "【{会社名}】{期間} 給与明細のご確認",
  body: "社長\n\nお疲れさまです。\n{期間}分の給与明細（{人数}名分）を添付にてお送りします。\nご確認いただき、問題なければご返信をお願いいたします。",
};

export async function getReviewMailTemplate(): Promise<ReviewMailTemplate> {
  const setting = await prisma.setting.findUnique({ where: { key: REVIEW_MAIL_TEMPLATE_KEY } });
  if (!setting) return REVIEW_MAIL_TEMPLATE_FALLBACK;
  try {
    return { ...REVIEW_MAIL_TEMPLATE_FALLBACK, ...JSON.parse(setting.value) };
  } catch {
    return REVIEW_MAIL_TEMPLATE_FALLBACK;
  }
}

export async function setReviewMailTemplate(template: ReviewMailTemplate) {
  const value = JSON.stringify(template);
  return prisma.setting.upsert({
    where: { key: REVIEW_MAIL_TEMPLATE_KEY },
    update: { value },
    create: { key: REVIEW_MAIL_TEMPLATE_KEY, value },
  });
}

// 社長への振込完了メールの文面（{会社名}・{期間}・{振込日} は送信時に置き換える）
const TRANSFER_NOTICE_MAIL_TEMPLATE_KEY = "transferNoticeMailTemplate";

export interface TransferNoticeMailTemplate {
  subject: string;
  body: string;
}

const TRANSFER_NOTICE_MAIL_TEMPLATE_FALLBACK: TransferNoticeMailTemplate = {
  subject: "【{会社名}】{期間}分 給与の振込が完了しました",
  body: "社長\n\nお疲れさまです。\n{期間}分（{振込日}）の給与の振込がすべて完了しました。\nご確認のほど、よろしくお願いいたします。",
};

export async function getTransferNoticeMailTemplate(): Promise<TransferNoticeMailTemplate> {
  const setting = await prisma.setting.findUnique({
    where: { key: TRANSFER_NOTICE_MAIL_TEMPLATE_KEY },
  });
  if (!setting) return TRANSFER_NOTICE_MAIL_TEMPLATE_FALLBACK;
  try {
    return { ...TRANSFER_NOTICE_MAIL_TEMPLATE_FALLBACK, ...JSON.parse(setting.value) };
  } catch {
    return TRANSFER_NOTICE_MAIL_TEMPLATE_FALLBACK;
  }
}

export async function setTransferNoticeMailTemplate(template: TransferNoticeMailTemplate) {
  const value = JSON.stringify(template);
  return prisma.setting.upsert({
    where: { key: TRANSFER_NOTICE_MAIL_TEMPLATE_KEY },
    update: { value },
    create: { key: TRANSFER_NOTICE_MAIL_TEMPLATE_KEY, value },
  });
}

const COMPANY_INFO_KEY = "companyInfo";

export interface CompanyInfo {
  name: string;
  postalCode: string;
  address: string;
  phone: string;
  fax: string;
  bankName: string;
  bankBranch: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  invoiceRegistrationNumber: string;
  invoiceMailSubject: string;
  invoiceMailBody: string;
  taxAccountantEmail: string;
  logoDataUrl: string;
  sealDataUrl: string;
}

const COMPANY_INFO_FALLBACK: CompanyInfo = {
  name: "",
  postalCode: "",
  address: "",
  phone: "",
  fax: "",
  bankName: "",
  bankBranch: "",
  bankAccountType: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
  invoiceRegistrationNumber: "",
  invoiceMailSubject: "【{会社名}】請求書のご送付（{期間}）",
  invoiceMailBody:
    "{契約者名} 御中\n\nいつもお世話になっております。\n{期間}分の請求書を添付にてお送りいたします。\nご確認のほど、よろしくお願いいたします。\n\n{会社名}",
  taxAccountantEmail: "",
  logoDataUrl: "",
  sealDataUrl: "",
};

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const setting = await prisma.setting.findUnique({ where: { key: COMPANY_INFO_KEY } });
  if (!setting) return COMPANY_INFO_FALLBACK;
  try {
    return { ...COMPANY_INFO_FALLBACK, ...JSON.parse(setting.value) };
  } catch {
    return COMPANY_INFO_FALLBACK;
  }
}

export async function setCompanyInfo(info: CompanyInfo) {
  return prisma.setting.upsert({
    where: { key: COMPANY_INFO_KEY },
    update: { value: JSON.stringify(info) },
    create: { key: COMPANY_INFO_KEY, value: JSON.stringify(info) },
  });
}

export function fillInvoiceMailTemplate(
  template: string,
  vars: { 会社名: string; 契約者名: string; 期間: string }
) {
  return template
    .replaceAll("{会社名}", vars.会社名)
    .replaceAll("{契約者名}", vars.契約者名)
    .replaceAll("{期間}", vars.期間);
}
