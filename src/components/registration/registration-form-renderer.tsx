"use client";

import type { FormField, FormSchema } from "@/lib/registration/form-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type RegistrationFormRendererProps = {
  schema: FormSchema;
  values: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
};

export function RegistrationFormRenderer({
  schema,
  values,
  onChange,
  errors = {},
  disabled,
}: RegistrationFormRendererProps) {
  return (
    <div className="space-y-4">
      {schema.fields.map((field) => (
        <FormFieldInput
          key={field.id}
          field={field}
          value={values[field.id]}
          onChange={(v) => onChange(field.id, v)}
          error={errors[field.id]}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function FormFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
}: {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled?: boolean;
}) {
  const label = field.label ?? field.id.replace(/_/g, " ");

  if (field.type === "consent") {
    return (
      <div className="space-y-2">
        <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-border p-4">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 accent-primary"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            aria-invalid={!!error}
          />
          <span className="text-body">
            {label}
            {field.required ? " *" : ""}
          </span>
        </label>
        {error ? <p className="text-body-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.id}>
          {label}
          {field.required ? " *" : ""}
        </Label>
        <select
          id={field.id}
          className="flex h-12 w-full rounded-[var(--radius-sm)] border border-input bg-background px-4 text-body"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={!!error}
        >
          <option value="">Select…</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {error ? <p className="text-body-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.id}>
          {label}
          {field.required ? " *" : ""}
        </Label>
        <textarea
          id={field.id}
          className="flex min-h-24 w-full rounded-[var(--radius-sm)] border border-input bg-background px-4 py-3 text-body"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.placeholder}
          aria-invalid={!!error}
        />
        {error ? <p className="text-body-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  const inputType =
    field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text";

  return (
    <div className="space-y-2">
      <Label htmlFor={field.id}>
        {label}
        {field.required ? " *" : ""}
      </Label>
      <Input
        id={field.id}
        type={inputType}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={field.placeholder ?? (field.type === "phone" ? "+91 9876543210" : undefined)}
        aria-invalid={!!error}
      />
      {error ? <p className="text-body-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function formatPrice(cents: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(cents / 100);
}
