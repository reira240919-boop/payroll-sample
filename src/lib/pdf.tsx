import fs from "fs";
import path from "path";
import type { ReactNode } from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { calcConsumptionTax } from "@/lib/invoice";

// Keep this as .ttf, not .woff: with the woff version every PDF took ~5s
// to render (the font data gets decompressed over and over), vs ~40ms
// with the same font as an uncompressed ttf.
Font.register({
  family: "NotoSansJP",
  src: path.join(process.cwd(), "src/assets/fonts/NotoSansJP-Regular.ttf"),
});

// With no spaces, Japanese text is one long unbreakable run and react-pdf
// always inserts a visible "-" wherever it force-breaks one internally.
// A real space between every character makes each gap a normal breakable
// point instead (no hyphen), and shrinking that space's font size to near
// zero keeps it invisible so the text still reads as continuous Japanese.
function withWrapBreaks(text: string): ReactNode[] {
  return Array.from(text).flatMap((ch, i) => [
    ch,
    <Text key={i} style={{ fontSize: 0.1 }}> </Text>,
  ]);
}

// Circled digits (①②③...) that admins type into group labels aren't covered
// by this font subset (renders as tofu boxes) and no Noto Sans fallback we
// tried covers them either, so normalize them to plain digits for PDF output.
const CIRCLED_DIGITS: Record<string, string> = {
  "①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5",
  "⑥": "6", "⑦": "7", "⑧": "8", "⑨": "9", "⑩": "10",
  "⑪": "11", "⑫": "12", "⑬": "13", "⑭": "14", "⑮": "15",
  "⑯": "16", "⑰": "17", "⑱": "18", "⑲": "19", "⑳": "20",
};

// Same problem for the parenthesized company marks used in contractor names
// (e.g. ㈱アルモ): the font has no glyph, so it draws on top of the next character.
const PARENTHESIZED_MARKS: Record<string, string> = {
  "㈱": "(株)",
  "㈲": "(有)",
};

function normalizeForPdf(text: string): string {
  return text
    .replace(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/g, (ch) => `${CIRCLED_DIGITS[ch]}.`)
    .replace(/[㈱㈲]/g, (ch) => PARENTHESIZED_MARKS[ch]);
}

// Falls back to a static file only until the company-info settings screen
// has a logo/seal uploaded into the database; once that's confirmed working
// these files (and this fallback) go away.
const LOGO_PATH = path.join(process.cwd(), "public/company/logo.png");
const fallbackLogoSrc = fs.existsSync(LOGO_PATH)
  ? `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString("base64")}`
  : null;

const SEAL_PATH = path.join(process.cwd(), "public/company/seal.png");
const fallbackSealSrc = fs.existsSync(SEAL_PATH)
  ? `data:image/png;base64,${fs.readFileSync(SEAL_PATH).toString("base64")}`
  : null;

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "NotoSansJP",
    fontSize: 10,
  },
  title: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 14,
  },
  header: {
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 10,
    marginTop: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  employeeName: {
    fontSize: 12,
  },
  registrationNumber: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  colSite: { width: "25%" },
  colType: { width: "12%" },
  colHours: { width: "10%", textAlign: "right" },
  colRate: { width: "16%", textAlign: "right" },
  colAmount: { width: "22%", textAlign: "right" },
  colSummary: { width: "15%", textAlign: "right" },
  colSummaryText: { fontSize: 8, color: "#666" },
  contractorHeading: { fontSize: 10, fontWeight: "bold", marginTop: 8, marginBottom: 2 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  netPay: {
    fontSize: 14,
    marginTop: 10,
    textAlign: "right",
    fontWeight: "bold",
  },
  letterhead: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
  },
  logo: {
    width: 170,
  },
  seal: {
    width: 62,
    height: 62,
    marginLeft: -14,
    marginTop: 28,
  },
});

export interface PayslipPdfData {
  employeeName: string;
  periodMonthLabel: string;
  registrationNumber?: string | null;
  earningLines: {
    siteName: string;
    contractorName?: string | null;
    workType?: string | null;
    hours: number;
    quantityUnit?: string | null;
    rate: number;
    amount: number;
    taxable?: boolean;
  }[];
  deductionLines: {
    itemName: string;
    quantity?: number | null;
    amount: number;
    taxable?: boolean;
    taxCategory?: string | null;
  }[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  logoDataUrl?: string | null;
  sealDataUrl?: string | null;
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

type EarningLine = PayslipPdfData["earningLines"][number];

function groupEarningLinesByContractor(lines: EarningLine[]) {
  const order: (string | null)[] = [];
  const groups = new Map<string | null, EarningLine[]>();

  for (const line of lines) {
    const key = line.contractorName || null;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(line);
  }

  return order.map((contractorName) => ({ contractorName, lines: groups.get(contractorName)! }));
}

export function PayslipDocument({ data }: { data: PayslipPdfData }) {
  const visibleDeductionLines = data.deductionLines.filter((line) => line.amount !== 0);
  const earningGroups = groupEarningLinesByContractor(data.earningLines);
  const logoSrc = data.logoDataUrl || fallbackLogoSrc;
  const sealSrc = data.sealDataUrl || fallbackSealSrc;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>支払明細書</Text>
        <View style={styles.header}>
          <Text style={styles.employeeName}>氏名: {data.employeeName}</Text>
          <Text style={styles.registrationNumber}>
            登録番号: {data.registrationNumber || "-"}
          </Text>
        </View>

        <View style={[styles.sectionTitle, styles.sectionTitleRow]}>
          <Text>支給</Text>
          <Text>{data.periodMonthLabel}</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.colSite}>詳細</Text>
          <Text style={styles.colType}>作業種別</Text>
          <Text style={styles.colHours}>数量</Text>
          <Text style={styles.colRate}>単価</Text>
          <Text style={styles.colAmount}>金額</Text>
          <Text style={styles.colSummary}>概要</Text>
        </View>
        {earningGroups.map((group, gi) => (
          <View key={gi}>
            {group.contractorName && (
              <Text style={styles.contractorHeading}>{normalizeForPdf(group.contractorName)}</Text>
            )}
            {group.lines.map((line, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colSite}>{normalizeForPdf(line.siteName)}</Text>
                <Text style={styles.colType}>{line.workType || "-"}</Text>
                <Text style={styles.colHours}>
                  {formatHours(line.hours)}
                  {line.quantityUnit && line.quantityUnit !== "入力なし" && (
                    <Text style={styles.colSummaryText}> {line.quantityUnit}</Text>
                  )}
                </Text>
                <Text style={styles.colRate}>{line.rate.toLocaleString()}</Text>
                <Text style={styles.colAmount}>{line.amount.toLocaleString()}</Text>
                <Text style={[styles.colSummary, styles.colSummaryText]}>
                  {line.taxable === false ? "消費税対象外" : "10%対象(税込)"}
                </Text>
              </View>
            ))}
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text>支給合計: {data.totalEarnings.toLocaleString()}円</Text>
        </View>

        <Text style={styles.sectionTitle}>控除</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colSite}>項目</Text>
          <Text style={styles.colType}></Text>
          <Text style={styles.colHours}>数量</Text>
          <Text style={styles.colRate}></Text>
          <Text style={styles.colAmount}>金額</Text>
          <Text style={styles.colSummary}>概要</Text>
        </View>
        {visibleDeductionLines.map((line, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colSite}>{normalizeForPdf(line.itemName)}</Text>
            <Text style={styles.colType}></Text>
            <Text style={styles.colHours}>{line.quantity ?? ""}</Text>
            <Text style={styles.colRate}></Text>
            <Text style={styles.colAmount}>{line.amount.toLocaleString()}</Text>
            <Text style={[styles.colSummary, styles.colSummaryText]}>
              {line.taxable === false ? "消費税対象外" : `${line.taxCategory || "10%対象"}(税込)`}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text>控除合計: {data.totalDeductions.toLocaleString()}円</Text>
        </View>

        <Text style={styles.netPay}>
          差引支給額: {data.netPay.toLocaleString()}円
        </Text>

        {logoSrc && (
          <View style={styles.letterhead} wrap={false}>
            <Image src={logoSrc} style={styles.logo} />
            {sealSrc && <Image src={sealSrc} style={styles.seal} />}
          </View>
        )}
      </Page>
    </Document>
  );
}

export interface InvoicePdfData {
  contractorName: string;
  issueDate: string;
  periodLabel: string;
  chargeGroups: {
    groupLabel: string | null;
    lines: {
      content: string;
      quantity: number | null;
      unit: string | null;
      unitPrice: number | null;
      amount: number;
      taxCategory: string | null;
    }[];
  }[];
  deductionLines: {
    content: string;
    quantity: number | null;
    unitPrice: number | null;
    amount: number;
    taxCategory: string | null;
  }[];
  chargeTotal: number;
  deductionTotal: number;
  bank: {
    bankName: string;
    bankBranch: string;
    bankAccountType: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
  };
  company: {
    name: string;
    postalCode: string;
    address: string;
    phone: string;
    fax: string;
    invoiceRegistrationNumber: string;
  };
  memo?: string | null;
  logoDataUrl?: string | null;
  sealDataUrl?: string | null;
}

const invoiceStyles = StyleSheet.create({
  title: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 12,
  },
  dateRow: {
    textAlign: "right",
    fontSize: 9,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  toRow: {
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    width: 220,
  },
  companyBlock: {
    width: 295,
    alignItems: "flex-end",
  },
  companyLogoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  headerLogo: {
    width: 130,
  },
  headerSeal: {
    width: 48,
    height: 48,
    marginLeft: -10,
    marginTop: 24,
  },
  companyText: {
    fontSize: 8,
    color: "#444",
    lineHeight: 1.5,
    textAlign: "right",
  },
  amountBox: {
    width: 220,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    backgroundColor: "#eaf3fa",
    borderLeftWidth: 4,
    borderLeftColor: "#2f6fa5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  amountLabel: {
    fontSize: 10,
    color: "#555",
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 2,
  },
  colContent: { width: "38%" },
  colQty: { width: "13%", textAlign: "right" },
  colPrice: { width: "17%", textAlign: "right" },
  colAmt: { width: "18%", textAlign: "right" },
  colTax: { width: "14%", fontSize: 8, color: "#666", textAlign: "right" },
  bankBlock: {
    marginTop: 4,
    width: 220,
    borderWidth: 1,
    borderColor: "#333",
    padding: 5,
    fontSize: 10,
    color: "#222",
    lineHeight: 1.4,
  },
  bankBlockTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 3,
  },
  memoBlock: {
    marginTop: 10,
    width: 345,
    fontSize: 9,
    color: "#444",
    lineHeight: 1.5,
  },
  memoBlockTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 3,
    color: "#222",
  },
  subRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
    fontSize: 9,
    color: "#555",
  },
});

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const visibleDeductions = data.deductionLines.filter((l) => l.amount !== 0);
  const allChargeLines = data.chargeGroups.flatMap((g) => g.lines);
  const { tax: chargeTax } = calcConsumptionTax(allChargeLines);
  const { tax: deductionTax } = calcConsumptionTax(visibleDeductions);
  const chargeGrandTotal = data.chargeTotal + chargeTax;
  const deductionGrandTotal = data.deductionTotal + deductionTax;
  const total = chargeGrandTotal - deductionGrandTotal;
  const logoSrc = data.logoDataUrl || fallbackLogoSrc;
  const sealSrc = data.sealDataUrl || fallbackSealSrc;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={invoiceStyles.title}>請求書</Text>
        <Text style={invoiceStyles.dateRow}>{data.issueDate}</Text>

        <View style={invoiceStyles.headerRow}>
          <Text style={invoiceStyles.toRow}>{normalizeForPdf(data.contractorName)} 御中</Text>
          <View style={invoiceStyles.companyBlock}>
            {logoSrc && (
              <View style={invoiceStyles.companyLogoRow}>
                <Image src={logoSrc} style={invoiceStyles.headerLogo} />
                {sealSrc && <Image src={sealSrc} style={invoiceStyles.headerSeal} />}
              </View>
            )}
            {data.company.invoiceRegistrationNumber && (
              <Text style={invoiceStyles.companyText}>
                登録番号: {data.company.invoiceRegistrationNumber}
              </Text>
            )}
          </View>
        </View>

        <View style={invoiceStyles.amountBox}>
          <Text style={invoiceStyles.amountLabel}>ご請求金額</Text>
          <Text style={invoiceStyles.amountValue}>{total.toLocaleString()}円</Text>
        </View>

        <View style={[styles.sectionTitle, styles.sectionTitleRow]}>
          <Text>請求項目</Text>
          <Text>{data.periodLabel}</Text>
        </View>
        <View style={styles.tableHeader}>
          <Text style={invoiceStyles.colContent}>内容</Text>
          <Text style={invoiceStyles.colQty}>数量</Text>
          <Text style={invoiceStyles.colPrice}>単価</Text>
          <Text style={invoiceStyles.colAmt}>金額</Text>
          <Text style={invoiceStyles.colTax}>概要</Text>
        </View>
        {data.chargeGroups.map((group, gi) => (
          <View key={gi}>
            {group.groupLabel && (
              <Text style={invoiceStyles.groupLabel}>{normalizeForPdf(group.groupLabel)}</Text>
            )}
            {group.lines.map((line, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={invoiceStyles.colContent}>{normalizeForPdf(line.content)}</Text>
                <Text style={invoiceStyles.colQty}>
                  {line.quantity ?? ""}
                  {line.unit || ""}
                </Text>
                <Text style={invoiceStyles.colPrice}>
                  {line.unitPrice != null ? line.unitPrice.toLocaleString() : ""}
                </Text>
                <Text style={invoiceStyles.colAmt}>{line.amount.toLocaleString()}</Text>
                <Text style={invoiceStyles.colTax}>{line.taxCategory || ""}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={invoiceStyles.subRow}>
          <Text>小計: {data.chargeTotal.toLocaleString()}円</Text>
        </View>
        <View style={invoiceStyles.subRow}>
          <Text>消費税(10%): {chargeTax.toLocaleString()}円</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={{ fontWeight: "bold" }}>合計: {chargeGrandTotal.toLocaleString()}円</Text>
        </View>

        {visibleDeductions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>控除項目</Text>
            <View style={styles.tableHeader}>
              <Text style={invoiceStyles.colContent}>内容</Text>
              <Text style={invoiceStyles.colQty}>数量</Text>
              <Text style={invoiceStyles.colPrice}>単価</Text>
              <Text style={invoiceStyles.colAmt}>金額</Text>
              <Text style={invoiceStyles.colTax}>概要</Text>
            </View>
            {visibleDeductions.map((line, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={invoiceStyles.colContent}>{normalizeForPdf(line.content)}</Text>
                <Text style={invoiceStyles.colQty}>
                  {line.quantity ? `${line.quantity}個` : ""}
                </Text>
                <Text style={invoiceStyles.colPrice}>
                  {line.unitPrice ? line.unitPrice.toLocaleString() : ""}
                </Text>
                <Text style={invoiceStyles.colAmt}>{line.amount.toLocaleString()}</Text>
                <Text style={invoiceStyles.colTax}>{line.taxCategory || ""}</Text>
              </View>
            ))}
            <View style={invoiceStyles.subRow}>
              <Text>控除小計: {data.deductionTotal.toLocaleString()}円</Text>
            </View>
            <View style={invoiceStyles.subRow}>
              <Text>消費税: {deductionTax.toLocaleString()}円</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ fontWeight: "bold" }}>
                控除合計: {deductionGrandTotal.toLocaleString()}円
              </Text>
            </View>
          </>
        )}

        <Text style={styles.netPay}>ご請求金額: {total.toLocaleString()}円</Text>

        <View style={invoiceStyles.bankBlock} wrap={false}>
          <Text style={invoiceStyles.bankBlockTitle}>【振込先】</Text>
          <Text>
            {data.bank.bankName} {data.bank.bankBranch}
          </Text>
          <Text>
            {data.bank.bankAccountType} {data.bank.bankAccountNumber}
          </Text>
          <Text>{data.bank.bankAccountHolder}</Text>
        </View>

        {data.memo && (
          <View style={invoiceStyles.memoBlock} wrap={false}>
            <Text style={invoiceStyles.memoBlockTitle}>【備考】</Text>
            <Text>{withWrapBreaks(data.memo)}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
