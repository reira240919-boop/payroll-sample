import { LINE_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/payroll";

interface EarningLine {
  id: string;
  siteName: string;
  contractorName?: string | null;
  workType: string | null;
  hours: number;
  rate: number;
  amount: number;
  taxable?: boolean;
}

interface DeductionLine {
  id: string;
  itemName: string;
  amount: number;
  lineType: string;
  taxable?: boolean;
  taxCategory?: string | null;
}

const OVERTIME_SUFFIX = "（残業）";

interface SiteGroup {
  siteName: string;
  lines: EarningLine[];
}

interface ContractorGroup {
  contractorName: string | null;
  sites: SiteGroup[];
}

function groupEarningLines(lines: EarningLine[]): ContractorGroup[] {
  const contractorOrder: (string | null)[] = [];
  const siteOrderByContractor = new Map<string | null, string[]>();
  const linesByContractorAndSite = new Map<string | null, Map<string, EarningLine[]>>();

  for (const line of lines) {
    const isOvertime = line.siteName.endsWith(OVERTIME_SUFFIX);
    const baseName = isOvertime ? line.siteName.slice(0, -OVERTIME_SUFFIX.length) : line.siteName;
    const contractorKey = line.contractorName || null;

    if (!linesByContractorAndSite.has(contractorKey)) {
      linesByContractorAndSite.set(contractorKey, new Map());
      siteOrderByContractor.set(contractorKey, []);
      contractorOrder.push(contractorKey);
    }
    const sitesMap = linesByContractorAndSite.get(contractorKey)!;
    if (!sitesMap.has(baseName)) {
      sitesMap.set(baseName, []);
      siteOrderByContractor.get(contractorKey)!.push(baseName);
    }
    sitesMap.get(baseName)!.push(line);
  }

  return contractorOrder.map((contractorName) => ({
    contractorName,
    sites: siteOrderByContractor.get(contractorName)!.map((siteName) => ({
      siteName,
      lines: linesByContractorAndSite.get(contractorName)!.get(siteName)!,
    })),
  }));
}

export default function PayslipLines({
  earningLines,
  deductionLines,
  totalEarnings,
  totalDeductions,
  netPay,
}: {
  earningLines: EarningLine[];
  deductionLines: DeductionLine[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
}) {
  const groups = groupEarningLines(earningLines);
  const visibleDeductionLines = deductionLines.filter((l) => l.amount !== 0);

  return (
    <>
      <section className="mb-6">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          支給（詳細ごと）
        </h3>
        <div className="space-y-4">
          {groups.length === 0 && <p className="text-sm text-slate-500">支給行がありません。</p>}
          {groups.map((group, gi) => (
            <div key={group.contractorName ?? `__none-${gi}`}>
              {group.contractorName && (
                <p className="mb-2 text-sm font-bold text-slate-900">{group.contractorName}</p>
              )}
              <div className={`space-y-2 ${group.contractorName ? "pl-1" : ""}`}>
                {group.sites.map((site) => {
                  const subtotal = site.lines.reduce((s, l) => s + l.amount, 0);
                  return (
                    <div
                      key={site.siteName}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="mb-2 text-sm font-medium text-slate-800">{site.siteName}</p>
                      <div className="space-y-1.5">
                        {site.lines.map((line) => {
                          const isOvertime = line.siteName.endsWith(OVERTIME_SUFFIX);
                          const label = isOvertime ? "残業" : line.workType || "通常";
                          return (
                            <div key={line.id} className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold ${
                                    isOvertime
                                      ? "border-amber-200 bg-amber-50 text-amber-700"
                                      : "border-blue-100 bg-blue-50 text-blue-600"
                                  }`}
                                >
                                  {label}
                                </span>
                                <span className="truncate text-xs tabular-nums text-slate-500">
                                  {line.hours}h × {formatCurrency(line.rate)}
                                </span>
                                {line.taxable === false && (
                                  <span className="shrink-0 rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">
                                    消費税対象外
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 text-sm font-bold tabular-nums">
                                {formatCurrency(line.amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {site.lines.length > 1 && (
                        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-xs">
                          <span className="text-slate-500">小計</span>
                          <span className="font-bold tabular-nums">{formatCurrency(subtotal)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">控除</h3>
        <div className="space-y-2">
          {visibleDeductionLines.length === 0 && (
            <p className="text-sm text-slate-500">控除行がありません。</p>
          )}
          {visibleDeductionLines.map((line) => (
            <div
              key={line.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {line.itemName}
                  {line.taxable === false ? (
                    <span className="ml-2 rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                      消費税対象外
                    </span>
                  ) : (
                    line.taxCategory === "8%対象" && (
                      <span className="ml-2 rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                        8%対象
                      </span>
                    )
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {LINE_TYPE_LABELS[line.lineType] || line.lineType}
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums">{formatCurrency(line.amount)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex justify-between text-sm text-slate-600">
          <span>支給合計</span>
          <span className="font-semibold tabular-nums text-slate-900">
            {formatCurrency(totalEarnings)}
          </span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>控除合計</span>
          <span className="font-semibold tabular-nums text-slate-900">
            −{formatCurrency(totalDeductions)}
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-blue-100 pt-2">
          <span className="text-sm font-bold text-slate-900">差引支給額</span>
          <span className="text-2xl font-extrabold tabular-nums text-blue-700">
            {formatCurrency(netPay)}
          </span>
        </div>
      </div>
    </>
  );
}
