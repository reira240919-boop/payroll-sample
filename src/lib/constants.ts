export const DEFAULT_DEDUCTION_TEMPLATES = [
  { itemName: "家賃", sortOrder: 0 },
  { itemName: "駐車場代", sortOrder: 1 },
  { itemName: "作業着代", sortOrder: 2 },
] as const;

export const DAILY_REPORT_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  submitted: "提出済",
  approved: "承認済",
};

export const PAYSLIP_STATUS_LABELS: Record<string, string> = {
  draft: "未確定",
  approved: "確定済",
};

export const PERIOD_STATUS_LABELS: Record<string, string> = {
  open: "締め処理中",
  closed: "締め済",
};

export const LINE_TYPE_LABELS: Record<string, string> = {
  auto: "自動（日報）",
  manual: "手動（元請け等）",
  fixed: "固定控除",
  variable: "変動控除",
  advance: "前払金",
};
