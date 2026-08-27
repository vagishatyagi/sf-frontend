import type { Contact } from "./types";

const CRLF = "\r\n";

function escapeValue(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

/** Serialize a contact as a vCard 3.0 payload accepted by phone contact apps. */
export function serializeContactVCard(
  contact: Contact,
  { includeNotes = true }: { includeNotes?: boolean } = {},
): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeValue(contact.last_name)};${escapeValue(contact.first_name)};;;`,
    `FN:${escapeValue(contact.full_name)}`,
  ];

  if (contact.company) lines.push(`ORG:${escapeValue(contact.company)}`);
  if (contact.job_title) lines.push(`TITLE:${escapeValue(contact.job_title)}`);
  lines.push(`EMAIL;TYPE=INTERNET:${escapeValue(contact.email)}`);
  if (contact.phone) lines.push(`TEL;TYPE=CELL:${escapeValue(contact.phone)}`);

  for (const address of contact.addresses) {
    const parts = [
      "",
      "",
      address.address,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ];
    lines.push(
      `ADR;TYPE=${address.type.toUpperCase()}:${parts
        .map((part) => escapeValue(part ?? ""))
        .join(";")}`,
    );
  }

  if (includeNotes && contact.notes) lines.push(`NOTE:${escapeValue(contact.notes)}`);
  lines.push("END:VCARD");
  return `${lines.join(CRLF)}${CRLF}`;
}

/** Stable, filesystem-safe name for a downloaded contact card. */
export function contactVCardFilename(
  contact: Pick<Contact, "id" | "full_name">,
): string {
  const slug = contact.full_name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || `contact-${contact.id}`}.vcf`;
}
