"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FormField, FormSchema } from "@/lib/registration/form-schema";

export default function FormEditorPage() {
  const params = useParams<{ orgSlug: string; eventId: string }>();
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "saving">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/form-schema`)
      .then((r) => r.json())
      .then((data) => {
        setSchema(data.formSchema);
        setStatus("idle");
      });
  }, [params.orgSlug, params.eventId]);

  function addField(type: FormField["type"]) {
    if (!schema) return;
    const id = `custom_${Date.now()}`;
    const field: FormField = {
      id,
      type,
      label: type === "consent" ? "I agree" : "New field",
      required: false,
    };
    if (type === "select") field.options = ["Option 1", "Option 2"];
    setSchema({ fields: [...schema.fields, field] });
  }

  function updateField(index: number, patch: Partial<FormField>) {
    if (!schema) return;
    const fields = [...schema.fields];
    fields[index] = { ...fields[index], ...patch };
    setSchema({ fields });
  }

  function removeField(index: number) {
    if (!schema) return;
    const field = schema.fields[index];
    if (field.system) return;
    setSchema({ fields: schema.fields.filter((_, i) => i !== index) });
  }

  async function save() {
    if (!schema) return;
    setStatus("saving");
    const res = await fetch(
      `/api/v1/orgs/${params.orgSlug}/events/${params.eventId}/form-schema`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ formSchema: schema }),
      },
    );
    if (res.ok) {
      setMessage("Saved");
    } else {
      const data = await res.json();
      setMessage(data.error?.message ?? "Save failed");
    }
    setStatus("idle");
  }

  if (status === "loading" || !schema) {
    return <p className="p-8 text-body">Loading form…</p>;
  }

  const customFields = schema.fields.filter((f) => !f.system);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/orgs/${params.orgSlug}/events/${params.eventId}`}
          className="text-label text-primary underline"
        >
          ← Event settings
        </Link>
        <h1 className="mt-2 text-headline">Registration form</h1>
        <p className="text-body-sm text-muted-foreground">
          System fields (name, email, phone, terms) are always included.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {schema.fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-[var(--radius-md)] border border-border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-title-md">
                  {field.label ?? field.id}
                  {field.system ? " (system)" : ""}
                </p>
                {!field.system ? (
                  <Button variant="ghost" size="sm" onClick={() => removeField(index)}>
                    Remove
                  </Button>
                ) : null}
              </div>
              {!field.system ? (
                <>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={field.label ?? ""}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                    />
                  </div>
                  <label className="flex min-h-12 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.required ?? false}
                      onChange={(e) => updateField(index, { required: e.target.checked })}
                      className="h-5 w-5 accent-primary"
                    />
                    <span className="text-body">Required</span>
                  </label>
                </>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add custom field</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" className="min-h-12" onClick={() => addField("text")}>
            Text
          </Button>
          <Button variant="outline" className="min-h-12" onClick={() => addField("select")}>
            Select
          </Button>
          <Button variant="outline" className="min-h-12" onClick={() => addField("consent")}>
            Consent
          </Button>
        </CardContent>
      </Card>

      {message ? <p className="text-body-sm text-muted-foreground">{message}</p> : null}
      <Button onClick={save} disabled={status === "saving"} className="min-h-12">
        {status === "saving" ? "Saving…" : "Save form"}
      </Button>
    </div>
  );
}
