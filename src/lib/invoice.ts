export interface TaxableLine {
  amount: number;
  taxCategory: string | null;
}

export function calcConsumptionTax(lines: TaxableLine[]) {
  const base10 = lines
    .filter((l) => l.taxCategory === "10%対象")
    .reduce((s, l) => s + l.amount, 0);
  const base8 = lines
    .filter((l) => l.taxCategory === "8%対象")
    .reduce((s, l) => s + l.amount, 0);
  const tax10 = Math.round(base10 * 0.1);
  const tax8 = Math.round(base8 * 0.08);
  return { taxableBase: base10 + base8, tax: tax10 + tax8, tax10, tax8 };
}
