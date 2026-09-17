"use client";

import { cn } from "@/lib/utils";

type CargoMeasurementValues = {
  quantity: string;
  length: string;
  width: string;
  height: string;
  volume: string;
};

type CargoMeasurementErrors = Partial<
  Record<"quantity" | "length" | "width" | "height", string>
>;

type CargoMeasurementFieldsProps = {
  values: CargoMeasurementValues;
  errors?: CargoMeasurementErrors;
  onChange: (
    field: keyof Omit<CargoMeasurementValues, "volume">,
    value: string
  ) => void;
};

type UnitInputProps = {
  label: string;
  name: string;
  value: string;
  unit: string;
  placeholder?: string;
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number;
  step?: string;
  readOnly?: boolean;
  type?: React.HTMLInputTypeAttribute;
  helperText?: string;
  onChange?: (value: string) => void;
};

function UnitInput({
  label,
  name,
  value,
  unit,
  placeholder,
  error,
  inputMode = "decimal",
  min,
  step,
  readOnly = false,
  type = "number",
  helperText,
  onChange
}: UnitInputProps) {
  return (
    <label className="mb-0 block text-[14px] font-semibold text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      <div className="relative">
        <input
          name={name}
          type={type}
          inputMode={inputMode}
          min={min}
          step={step}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          onChange={
            onChange
              ? (event) => onChange(event.target.value.replace(/,/g, "."))
              : undefined
          }
          className={cn(
            "form-control w-full pr-14",
            readOnly && "cursor-default bg-slate-50 text-slate-700"
          )}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] font-bold text-slate-400">
          {unit}
        </span>
      </div>
      {helperText ? (
        <span className="mt-1 block text-xs font-medium text-slate-500">{helperText}</span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>
      ) : null}
    </label>
  );
}

export function CargoMeasurementFields({
  values,
  errors,
  onChange
}: CargoMeasurementFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <UnitInput
          label="Say"
          name="quantity"
          value={values.quantity}
          onChange={(value) => onChange("quantity", value)}
          unit="ədəd"
          placeholder="Məsələn, 20"
          inputMode="numeric"
          min={1}
          step="1"
          error={errors?.quantity}
        />
        <UnitInput
          label="Həcm"
          name="volume"
          value={values.volume}
          unit="m³"
          placeholder=""
          readOnly
          type="text"
          helperText="Uzunluq, en və hündürlük əsasında avtomatik hesablanır."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <UnitInput
          label="Uzunluq"
          name="length"
          value={values.length}
          onChange={(value) => onChange("length", value)}
          unit="m"
          placeholder="0.00"
          inputMode="decimal"
          min={0.001}
          step="0.001"
          error={errors?.length}
        />
        <UnitInput
          label="En"
          name="width"
          value={values.width}
          onChange={(value) => onChange("width", value)}
          unit="m"
          placeholder="0.00"
          inputMode="decimal"
          min={0.001}
          step="0.001"
          error={errors?.width}
        />
        <UnitInput
          label="Hündürlük"
          name="height"
          value={values.height}
          onChange={(value) => onChange("height", value)}
          unit="m"
          placeholder="0.00"
          inputMode="decimal"
          min={0.001}
          step="0.001"
          error={errors?.height}
        />
      </div>
    </div>
  );
}
