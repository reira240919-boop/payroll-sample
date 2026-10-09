import { addDays, format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayString(): string {
  return toDateString(new Date());
}

export function shiftDate(dateStr: string, days: number): string {
  return toDateString(addDays(parseISO(dateStr), days));
}

export function formatDateJa(dateStr: string): string {
  return format(parseISO(dateStr), "yyyy年M月d日（EEE）", { locale: ja });
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), "M/d（EEE）", { locale: ja });
}

export function monthKey(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${year}年${Number(month)}月`;
}
