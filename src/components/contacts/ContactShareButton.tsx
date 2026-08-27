"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import { Download, Loader2, QrCode, X } from "lucide-react";
import { toDataURL } from "qrcode";
import Button, { buttonClasses } from "@/components/ui/Button";
import {
  contactVCardFilename,
  serializeContactVCard,
} from "@/lib/contacts/vcard";
import type { Contact } from "@/lib/contacts/types";

export default function ContactShareButton({ contact }: { contact: Contact }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vCard = useMemo(() => serializeContactVCard(contact), [contact]);
  const qrVCard = useMemo(
    () => serializeContactVCard(contact, { includeNotes: false }),
    [contact],
  );
  const downloadHref = useMemo(
    () => `data:text/vcard;charset=utf-8,${encodeURIComponent(vCard)}`,
    [vCard],
  );

  useEffect(() => {
    if (!open || qrCode) return;

    let current = true;
    void toDataURL(qrVCard, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#111827", light: "#ffffff" },
    })
      .then((result) => {
        if (current) setQrCode(result);
      })
      .catch(() => {
        if (current) {
          setError("Could not create the QR code. Download the vCard instead.");
        }
      });

    return () => {
      current = false;
    };
  }, [open, qrCode, qrVCard]);

  return (
    <div className="relative">
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!open) setError(null);
          setOpen(!open);
        }}
      >
        <QrCode className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Share contact
      </Button>

      {open ? (
        <section
          id={panelId}
          role="dialog"
          aria-label={`Share ${contact.full_name}`}
          className="absolute right-0 top-11 z-20 w-72 rounded-xl border border-border bg-card p-4 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">
                Scan to add contact
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Opens {contact.full_name} in a compatible contacts app.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Close share panel"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-4 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white p-2">
            {qrCode ? (
              <Image
                src={qrCode}
                width={256}
                height={256}
                unoptimized
                alt={`QR code for ${contact.full_name}`}
                className="h-full w-full"
              />
            ) : error ? (
              <p role="alert" className="px-3 text-center text-sm text-destructive">
                {error}
              </p>
            ) : (
              <Loader2
                className="h-6 w-6 animate-spin text-primary"
                aria-label="Generating QR code"
              />
            )}
          </div>

          <a
            href={downloadHref}
            download={contactVCardFilename(contact)}
            className={buttonClasses("primary", "md", "mt-4 w-full")}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download vCard
          </a>
        </section>
      ) : null}
    </div>
  );
}
