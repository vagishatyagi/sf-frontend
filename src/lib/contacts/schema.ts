import { z } from "zod";
import type { ContactInput } from "./types";

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const PHOTO_DATA_URL = new RegExp(
  `^data:(${ACCEPTED_PHOTO_TYPES.join("|")});base64,(.*)$`,
  "s",
);

function isValidBase64(value: string): boolean {
  return (
    value.length > 0 &&
    value.length % 4 === 0 &&
    /^[A-Za-z0-9+/]*={0,2}$/.test(value)
  );
}

function decodedBase64Size(value: string): number {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return (value.length * 3) / 4 - padding;
}

export function photoMatchesMediaType(
  photo: string,
  mediaType: string,
): boolean {
  const comma = photo.indexOf(",");
  if (comma < 0) return false;

  try {
    const decoded = atob(photo.slice(comma + 1));
    const byte = (index: number) => decoded.charCodeAt(index);

    switch (mediaType) {
      case "image/jpeg":
        return byte(0) === 0xff && byte(1) === 0xd8 && byte(2) === 0xff;
      case "image/png":
        return decoded.startsWith("\u0089PNG\r\n\u001a\n");
      case "image/gif":
        return decoded.startsWith("GIF87a") || decoded.startsWith("GIF89a");
      case "image/webp":
        return decoded.startsWith("RIFF") && decoded.slice(8, 12) === "WEBP";
      default:
        return false;
    }
  } catch {
    return false;
  }
}

const photoSchema = z
  .string()
  .superRefine((value, context) => {
    if (!value) return;

    const match = PHOTO_DATA_URL.exec(value);
    if (!match) {
      context.addIssue({
        code: "custom",
        message: "Photo must be a JPEG, PNG, WebP, or GIF image",
      });
      return;
    }

    const base64 = match[2];
    if (!isValidBase64(base64)) {
      context.addIssue({
        code: "custom",
        message: "Photo must contain valid image data",
      });
      return;
    }

    if (decodedBase64Size(base64) > MAX_PHOTO_BYTES) {
      context.addIssue({
        code: "custom",
        message: "Photo must be 2 MiB or smaller",
      });
      return;
    }

    if (!photoMatchesMediaType(value, match[1])) {
      context.addIssue({
        code: "custom",
        message: "Photo content does not match its declared image type",
      });
    }
  })
  .transform((value) => value || null)
  .nullable()
  .default(null);

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  address: optionalText(300, "Address"),
  city: optionalText(120, "City"),
  state: optionalText(120, "State"),
  postal_code: optionalText(20, "Postal code"),
  country: optionalText(120, "Country"),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
  photo: photoSchema,
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/** Collapse a ZodError into one message per field, keyed by input name. */
export function zodFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof ContactInput, string>> {
  const fieldErrors: Partial<Record<keyof ContactInput, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as keyof ContactInput] = issue.message;
    }
  }
  return fieldErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  name: keyof ContactInput;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Address",
    description: "Optional postal details.",
    fields: [
      {
        name: "address",
        label: "Street address",
        maxLength: 300,
        placeholder: "1 Market St, Suite 400",
        autoComplete: "street-address",
        wide: true,
      },
      {
        name: "city",
        label: "City",
        maxLength: 120,
        placeholder: "San Francisco",
        autoComplete: "address-level2",
      },
      {
        name: "state",
        label: "State / region",
        maxLength: 120,
        placeholder: "CA",
        autoComplete: "address-level1",
      },
      {
        name: "postal_code",
        label: "Postal code",
        maxLength: 20,
        placeholder: "94105",
        autoComplete: "postal-code",
      },
      {
        name: "country",
        label: "Country",
        maxLength: 120,
        placeholder: "USA",
        autoComplete: "country-name",
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

/** Pull the contact fields out of a submitted form, as raw strings. */
export function formDataToValues(
  formData: FormData,
): Record<keyof ContactInput, string> {
  return Object.fromEntries([
    ...CONTACT_FIELDS.map((field) => [
      field.name,
      String(formData.get(field.name) ?? ""),
    ]),
    ["photo", String(formData.get("photo") ?? "")],
  ]) as Record<keyof ContactInput, string>;
}
