"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const STEP_MINUTES = 30;

interface TimeWindowPickerProps {
  name: string;
  label?: string;
  defaultValue?: string;
  className?: string;
}

function toMinutes(value: string): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const mm = min % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function parseRange(value: string | undefined | null): { start: string; end: string } {
  const v = (value || "").trim();
  const m = v.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!m) {
    return { start: "", end: "" };
  }
  const start = `${m[1].padStart(2, "0")}:${m[2]}`;
  const end = `${m[3].padStart(2, "0")}:${m[4]}`;
  return { start, end };
}

export function TimeWindowPicker({
  name,
  label,
  defaultValue,
  className
}: TimeWindowPickerProps) {
  const initial = useMemo(() => parseRange(defaultValue), [defaultValue]);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);

  const options = useMemo(() => {
    const list: string[] = [];
    for (let min = 0; min < 24 * 60; min += STEP_MINUTES) {
      list.push(minutesToLabel(min));
    }
    return list;
  }, []);

  const visible = Boolean(start && end);

  const quickPresets = [
    "06:00",
    "08:00",
    "10:00",
    "12:00",
    "14:00",
    "16:00",
    "18:00",
    "20:00"
  ];

  return (
    <div className="form-group mb-0">
      {label && (
        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
          {label}
        </label>
      )}
      <input type="hidden" name={name} value={visible ? `${start} - ${end}` : ""} />

      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="ri-time-line text-slate-400"></i>
          </div>
          <select
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 pl-10 text-[15px] py-2.5 h-auto transition-shadow appearance-none"
          >
            <option value="">Başlanğıc</option>
            {options.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <i className="ri-arrow-down-s-line text-slate-400"></i>
          </div>
        </div>

        <span className="text-slate-400 font-semibold select-none">-</span>

        <div className="relative flex-1">
          <select
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="form-select w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 pl-3 text-[15px] py-2.5 h-auto transition-shadow appearance-none"
          >
            <option value="">Son</option>
            {options.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <i className="ri-arrow-down-s-line text-slate-400"></i>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {quickPresets.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              const startMin = toMinutes(t);
              if (startMin === null) return;
              const newStart = minutesToLabel(startMin);
              const newEnd = minutesToLabel(startMin + 120);
              setStart(newStart);
              setEnd(newEnd);
            }}
            className={cn(
              "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors",
              start === t
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"
            )}
          >
            {t} - {minutesToLabel(toMinutes(t)! + 120)}
          </button>
        ))}
      </div>

      <span className="text-[11px] font-medium text-slate-500 mt-1.5 block flex items-center gap-1">
        <i className="ri-time-line"></i> Başlanğıc və son saatı seçin
      </span>
    </div>
  );
}