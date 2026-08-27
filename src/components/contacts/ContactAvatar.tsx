"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { avatarHue, initials } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/** Circular photo with a deterministic initials fallback. */
export default function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<Contact, "first_name" | "last_name" | "email" | "photo">;
  size?: keyof typeof SIZES;
}) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const style = {
    "--avatar-hue": avatarHue(contact.email),
  } as CSSProperties;

  if (contact.photo && contact.photo !== failedPhoto) {
    return (
      // A data URL needs no remote optimization, and native onError drives fallback.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contact.photo}
        alt=""
        className={`aspect-square shrink-0 rounded-full object-cover ${SIZES[size]}`}
        onError={() => setFailedPhoto(contact.photo)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`contact-avatar inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-semibold ${SIZES[size]}`}
    >
      {initials(contact)}
    </span>
  );
}
