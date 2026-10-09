"use client";

import { useState } from "react";
import { formatDateJa, shiftDate, todayString } from "@/lib/date-utils";

type Props = {
  date: string;
  onChange: (date: string) => void;
};

export default function DateNavigator({ date, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const isToday = date === todayString();

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange(shiftDate(date, -1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-600 hover:bg-slate-50"
          aria-label="前の日"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="min-w-0 flex-1 rounded-lg px-2 py-2 text-center hover:bg-slate-50"
        >
          <p className="text-lg font-bold text-slate-900">{formatDateJa(date)}</p>
          {isToday && <p className="text-xs text-blue-600">今日</p>}
          <p className="mt-0.5 text-xs text-slate-500">タップで日付を選択</p>
        </button>

        <button
          type="button"
          onClick={() => onChange(shiftDate(date, 1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-lg text-slate-600 hover:bg-slate-50"
          aria-label="次の日"
        >
          ›
        </button>
      </div>

      {showPicker && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              onChange(e.target.value);
              setShowPicker(false);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
          {!isToday && (
            <button
              type="button"
              onClick={() => {
                onChange(todayString());
                setShowPicker(false);
              }}
              className="mt-2 w-full rounded-lg border border-blue-200 py-2 text-sm text-blue-700 hover:bg-blue-50"
            >
              今日に戻る
            </button>
          )}
        </div>
      )}
    </div>
  );
}
