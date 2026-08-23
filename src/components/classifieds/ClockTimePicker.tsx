"use client";

import { useState } from "react";
import { Timepicker } from "timepicker-ui-react";
import "timepicker-ui/main.css";
import { cn } from "@/lib/utils";

interface ClockTimePickerProps {
  name: string;
  label?: string;
  defaultValue?: string;
  className?: string;
}

const TIME_RE = /^(\d{1,2}):(\d{2})/;

function normalizeTime(value: string | undefined | null): string {
  const v = (value || "").trim();
  const m = v.match(TIME_RE);
  if (!m) return "";
  const hour = m[1].padStart(2, "0");
  const minute = m[2].padStart(2, "0");
  return `${hour}:${minute}`;
}

export function ClockTimePicker({
  name,
  label,
  defaultValue,
  className
}: ClockTimePickerProps) {
  const initial = normalizeTime(defaultValue);
  const [time, setTime] = useState(initial);

  return (
    <div className={cn("form-group mb-0", className)}>
      {label && (
        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
          {label}
        </label>
      )}

      <div className="flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-[15px] px-3.5 py-2" style={{ height: 64 }}>
        <i className="ri-time-line text-blue-500 text-[26px] leading-none"></i>

        <div className="flex-1 bg-white rounded-[10px] shadow-sm border border-slate-200 flex items-center justify-center" style={{ height: 44 }}>
          <Timepicker
            options={{
              clock: { type: "24h", autoSwitchToMinutes: true },
              ui: { mode: "clock", theme: "basic", clearButton: true },
              labels: { time: "Yükləmə saatı", ok: "Təsdiqlə", cancel: "Bağla", clear: "Təmizlə" }
            }}
            name={name}
            autoComplete="off"
            placeholder="--:--"
            value={time}
            onConfirm={(data) => {
              if (data && data.hour !== undefined && data.minutes !== undefined) {
                setTime(`${data.hour}:${data.minutes}`);
              }
            }}
            onClear={() => setTime("")}
            className="w-full bg-transparent text-center text-[22px] font-bold text-slate-800 leading-none focus:outline-none py-0 px-0 !h-auto border-0 shadow-none"
          />
        </div>
      </div>

      <span className="text-[11px] font-medium text-slate-500 mt-1.5 block flex items-center gap-1">
        <i className="ri-time-line"></i> Sahəyə klikləyib analog saatdan seçin
      </span>
    </div>
  );
}