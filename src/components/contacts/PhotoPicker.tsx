"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  photoMatchesMediaType,
} from "@/lib/contacts/schema";

const ACCEPT = ACCEPTED_PHOTO_TYPES.join(",");

export default function PhotoPicker({
  photo,
  error,
  onReadingChange,
}: {
  photo: string | null;
  error?: string;
  onReadingChange?: (reading: boolean) => void;
}) {
  const [sourcePhoto, setSourcePhoto] = useState(photo);
  const [currentPhoto, setCurrentPhoto] = useState(photo);
  const [localError, setLocalError] = useState<string | null>(null);
  const readerRef = useRef<FileReader | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (photo !== sourcePhoto) {
    setSourcePhoto(photo);
    setCurrentPhoto(photo);
  }

  useEffect(
    () => () => {
      readerRef.current?.abort();
    },
    [],
  );

  function finishReading(reader: FileReader) {
    if (readerRef.current !== reader) return false;
    readerRef.current = null;
    onReadingChange?.(false);
    return true;
  }

  function cancelReading() {
    const reader = readerRef.current;
    if (!reader) return;
    readerRef.current = null;
    reader.abort();
    onReadingChange?.(false);
  }

  function readPhoto(file: File) {
    // Invalidate the previous reader before validating the new choice. Otherwise
    // its late `load` event could overwrite the photo after a validation error.
    cancelReading();
    if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
      setLocalError("Photo must be a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setLocalError("Photo must be 2 MiB or smaller.");
      return;
    }

    const reader = new FileReader();
    readerRef.current = reader;
    setLocalError(null);
    onReadingChange?.(true);

    reader.onload = () => {
      if (!finishReading(reader)) return;
      if (typeof reader.result === "string") {
        if (photoMatchesMediaType(reader.result, file.type)) {
          setCurrentPhoto(reader.result);
        } else {
          setLocalError("Photo content does not match its file type.");
        }
      } else {
        setLocalError("Could not read that photo. Please try another file.");
      }
    };
    reader.onerror = () => {
      if (!finishReading(reader)) return;
      setLocalError("Could not read that photo. Please try another file.");
    };
    reader.onabort = () => {
      finishReading(reader);
    };
    try {
      reader.readAsDataURL(file);
    } catch {
      if (finishReading(reader)) {
        setLocalError("Could not read that photo. Please try another file.");
      }
    }
  }

  function removePhoto() {
    cancelReading();
    setCurrentPhoto(null);
    setLocalError(null);
  }

  const displayedError = localError ?? error;
  const errorId = "contact-photo-error";
  const helpId = "contact-photo-help";

  return (
    <fieldset className="space-y-3">
      <legend className="text-[13px] font-medium text-foreground">
        Contact photo
        <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
          optional
        </span>
      </legend>

      <p id={helpId} className="text-[12px] text-muted-foreground">
        JPEG, PNG, WebP, or GIF. Maximum 2 MiB.
      </p>

      {currentPhoto ? (
        // The local data URL is already loaded; optimization would only add overhead.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentPhoto}
          alt="Contact photo preview"
          className="aspect-square h-20 w-20 rounded-full object-cover"
        />
      ) : null}

      <input type="hidden" name="photo" value={currentPhoto ?? ""} />
      <input
        ref={inputRef}
        id="contact-photo"
        type="file"
        accept={ACCEPT}
        aria-label="Contact photo"
        aria-invalid={displayedError ? true : undefined}
        aria-describedby={displayedError ? `${helpId} ${errorId}` : helpId}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) readPhoto(file);
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-controls="contact-photo"
          aria-invalid={displayedError ? true : undefined}
          aria-describedby={displayedError ? `${helpId} ${errorId}` : helpId}
          onClick={() => inputRef.current?.click()}
        >
          {currentPhoto ? "Replace photo" : "Choose photo"}
        </Button>

        {currentPhoto ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="Remove photo"
            onClick={removePhoto}
          >
            Remove
          </Button>
        ) : null}
      </div>

      {displayedError ? (
        <p id={errorId} role="alert" className="text-[13px] text-destructive">
          {displayedError}
        </p>
      ) : null}
    </fieldset>
  );
}
