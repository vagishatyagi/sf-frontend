"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { ADDRESS_FIELDS } from "@/lib/contacts/schema";
import {
  ADDRESS_TYPES,
  type AddressFormValue,
  type AddressInput,
} from "@/lib/contacts/types";

const CONTROL =
  "w-full rounded-md border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:bg-input";

type EditableAddress = AddressFormValue & { key: string };

function editableAddress(
  address: AddressFormValue | AddressInput,
  key: string,
): EditableAddress {
  return {
    key,
    type: address.type,
    address: address.address,
    city: address.city ?? "",
    state: address.state ?? "",
    postal_code: address.postal_code ?? "",
    country: address.country ?? "",
  };
}

function emptyAddress(key: string): EditableAddress {
  return editableAddress(
    {
      type: "Home",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
    },
    key,
  );
}

export default function AddressesEditor({
  initialAddresses,
  errors = {},
}: {
  initialAddresses: Array<AddressFormValue | AddressInput>;
  errors?: Record<string, string>;
}) {
  const nextKey = useRef(initialAddresses.length);
  const [addresses, setAddresses] = useState<EditableAddress[]>(() =>
    initialAddresses.map((address, index) =>
      editableAddress(address, `initial-${index}`),
    ),
  );

  function update(index: number, field: keyof AddressFormValue, value: string) {
    setAddresses((current) =>
      current.map((address, addressIndex) =>
        addressIndex === index ? { ...address, [field]: value } : address,
      ),
    );
  }

  function addAddress() {
    setAddresses((current) => [
      ...current,
      emptyAddress(`new-${nextKey.current++}`),
    ]);
  }

  function removeAddress(index: number) {
    setAddresses((current) =>
      current.filter((_address, addressIndex) => addressIndex !== index),
    );
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Addresses</legend>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">
            Addresses
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Add home, work, or other postal addresses.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addAddress}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No addresses added.</p>
      ) : (
        <div className="space-y-4">
          {addresses.map((address, index) => {
            const number = index + 1;
            const typeName = `addresses.${index}.type`;
            const typeError = errors[typeName];
            const typeErrorId = `${typeName}-error`;

            return (
              <fieldset
                key={address.key}
                className="rounded-lg border border-border bg-card/50 p-4"
              >
                <legend className="px-1 text-[13px] font-semibold text-foreground">
                  Address {number}
                </legend>

                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="w-full max-w-48">
                    <label
                      htmlFor={typeName}
                      className="mb-1.5 block text-[13px] font-medium text-foreground"
                    >
                      Type
                    </label>
                    <select
                      id={typeName}
                      name={typeName}
                      aria-label={`Address ${number} type`}
                      aria-invalid={typeError ? true : undefined}
                      aria-describedby={typeError ? typeErrorId : undefined}
                      value={address.type}
                      onChange={(event) => update(index, "type", event.target.value)}
                      className={`${CONTROL} ${
                        typeError
                          ? "border-destructive focus:border-destructive"
                          : "border-border focus:border-primary"
                      }`}
                    >
                      {ADDRESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {typeError ? (
                      <p
                        id={typeErrorId}
                        role="alert"
                        className="mt-1.5 text-[13px] text-destructive"
                      >
                        {typeError}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove address ${number}`}
                    onClick={() => removeAddress(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Remove
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {ADDRESS_FIELDS.map((field) => {
                    const name = `addresses.${index}.${field.name}`;
                    const error = errors[name];
                    const errorId = `${name}-error`;
                    const required = field.name === "address";

                    return (
                      <div
                        key={field.name}
                        className={required ? "sm:col-span-2" : undefined}
                      >
                        <label
                          htmlFor={name}
                          className="mb-1.5 block text-[13px] font-medium text-foreground"
                        >
                          {field.label}
                          {required ? (
                            <span className="ml-1 text-destructive" aria-hidden="true">
                              *
                            </span>
                          ) : (
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                              optional
                            </span>
                          )}
                        </label>
                        <input
                          id={name}
                          name={name}
                          aria-label={`Address ${number} ${field.label.toLowerCase()}`}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={error ? errorId : undefined}
                          required={required}
                          maxLength={field.maxLength}
                          value={address[field.name]}
                          onChange={(event) =>
                            update(index, field.name, event.target.value)
                          }
                          className={`${CONTROL} ${
                            error
                              ? "border-destructive focus:border-destructive"
                              : "border-border focus:border-primary"
                          }`}
                        />
                        {error ? (
                          <p
                            id={errorId}
                            role="alert"
                            className="mt-1.5 text-[13px] text-destructive"
                          >
                            {error}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
