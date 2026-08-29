import { z } from "zod";

export type FormFieldType = "text" | "email" | "phone" | "select" | "textarea" | "consent";

export type FormField = {
  id: string;
  type: FormFieldType;
  label?: string;
  required?: boolean;
  system?: boolean;
  options?: string[];
  version?: string;
  placeholder?: string;
};

export type FormSchema = {
  fields: FormField[];
};

export const DEFAULT_FORM_SCHEMA: FormSchema = {
  fields: [
    { id: "first_name", type: "text", label: "First name", required: true, system: true },
    { id: "last_name", type: "text", label: "Last name", required: true, system: true },
    { id: "email", type: "email", label: "Email", required: true, system: true },
    { id: "phone", type: "phone", label: "Phone", required: true, system: true },
    {
      id: "terms",
      type: "consent",
      label: "I agree to the terms and privacy policy",
      required: true,
      system: true,
      version: "2026-08-01",
    },
  ],
};

const fieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "email", "phone", "select", "textarea", "consent"]),
  label: z.string().optional(),
  required: z.boolean().optional(),
  system: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  version: z.string().optional(),
  placeholder: z.string().optional(),
});

export const formSchemaValidator = z.object({
  fields: z.array(fieldSchema).min(1),
});

export function mergeFormSchema(
  eventSchema: FormSchema | null | undefined,
  ticketSchema: FormSchema | null | undefined,
): FormSchema {
  if (ticketSchema?.fields?.length) return ticketSchema;
  if (eventSchema?.fields?.length) return eventSchema;
  return DEFAULT_FORM_SCHEMA;
}

export function validateAnswers(
  schema: FormSchema,
  answers: Record<string, unknown>,
): { ok: true; data: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of schema.fields) {
    const value = answers[field.id];

    if (field.required) {
      if (field.type === "consent") {
        if (value !== true) {
          errors[field.id] = "Consent is required";
        }
      } else if (value === undefined || value === null || String(value).trim() === "") {
        errors[field.id] = "This field is required";
      }
    }

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      if (field.type === "email") {
        const emailResult = z.string().email().safeParse(value);
        if (!emailResult.success) errors[field.id] = "Invalid email";
      }
      if (field.type === "phone") {
        const phone = String(value).replace(/\s/g, "");
        if (!/^\+?[0-9]{10,15}$/.test(phone)) {
          errors[field.id] = "Enter a valid phone number (10–15 digits)";
        }
      }
      if (field.type === "select" && field.options?.length) {
        if (!field.options.includes(String(value))) {
          errors[field.id] = "Invalid selection";
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: answers };
}

export function extractSystemFields(answers: Record<string, unknown>) {
  return {
    firstName: String(answers.first_name ?? "").trim(),
    lastName: String(answers.last_name ?? "").trim(),
    email: String(answers.email ?? "")
      .trim()
      .toLowerCase(),
    phone: answers.phone ? String(answers.phone).replace(/\s/g, "") : null,
    company: answers.company ? String(answers.company).trim() : null,
  };
}
