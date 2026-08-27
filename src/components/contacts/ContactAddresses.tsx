import { addressLine } from "@/lib/contacts/format";
import {
  ADDRESS_TYPES,
  type AddressRead,
  type AddressType,
} from "@/lib/contacts/types";

function addressesByType(addresses: AddressRead[], type: AddressType) {
  return addresses.filter((address) => address.type === type);
}

export default function ContactAddresses({
  addresses,
}: {
  addresses: AddressRead[];
}) {
  return (
    <section
      aria-labelledby="addresses-heading"
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <div>
        <h2
          id="addresses-heading"
          className="font-display text-base font-semibold text-foreground"
        >
          Addresses
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Home, work, and other locations.
        </p>
      </div>

      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No addresses added.</p>
      ) : (
        <div className="space-y-5">
          {ADDRESS_TYPES.map((type) => {
            const group = addressesByType(addresses, type);
            if (group.length === 0) return null;

            const headingId = `address-group-${type.toLowerCase()}`;
            return (
              <section key={type} aria-labelledby={headingId} className="space-y-2">
                <h3
                  id={headingId}
                  className="font-display text-sm font-semibold text-foreground"
                >
                  {type}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.map((address, index) => (
                    <address
                      key={address.id}
                      aria-label={`${type} address ${index + 1}`}
                      className="rounded-md border border-hairline bg-background/50 p-3 text-sm not-italic text-foreground"
                    >
                      <span className="mb-2 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                        {type}
                      </span>
                      <p className="break-words leading-6">{addressLine(address)}</p>
                    </address>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
