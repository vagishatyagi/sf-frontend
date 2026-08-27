"use client";

import { Fragment, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import Field from "@/components/ui/Field";
import AddressesEditor from "@/components/contacts/AddressesEditor";
import PhotoPicker from "@/components/contacts/PhotoPicker";
import Button, { buttonClasses } from "@/components/ui/Button";
import { CONTACT_FIELD_GROUPS } from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  type Contact,
  type ContactScalarInputName,
  type FormState,
} from "@/lib/contacts/types";

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({
  label,
  photoReading,
}: {
  label: string;
  photoReading: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || photoReading}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);
  const [photoReading, setPhotoReading] = useState(false);

  function valueFor(name: ContactScalarInputName): string {
    return state.values?.[name] ?? contact?.[name] ?? "";
  }

  const addresses =
    state.values?.addresses ??
    contact?.addresses.map((address) => ({
      type: address.type,
      address: address.address,
      city: address.city ?? "",
      state: address.state ?? "",
      postal_code: address.postal_code ?? "",
      country: address.country ?? "",
    })) ??
    [];

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      <PhotoPicker
        photo={(state.values?.photo ?? contact?.photo ?? null) || null}
        error={state.fieldErrors?.photo}
        onReadingChange={setPhotoReading}
      />

      {CONTACT_FIELD_GROUPS.map((group) => (
        <Fragment key={group.title}>
          <fieldset className="space-y-4">
            <legend className="sr-only">{group.title}</legend>

            <div className="border-b border-hairline pb-2">
              <h2 className="font-display text-sm font-semibold text-foreground">
                {group.title}
              </h2>
              <p className="text-[13px] text-muted-foreground">
                {group.description}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {group.fields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  defaultValue={valueFor(field.name)}
                  error={state.fieldErrors?.[field.name]}
                />
              ))}
            </div>
          </fieldset>

          {group.title === "Work" ? (
            <AddressesEditor
              initialAddresses={addresses}
              errors={state.fieldErrors}
            />
          ) : null}
        </Fragment>
      ))}

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} photoReading={photoReading} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
