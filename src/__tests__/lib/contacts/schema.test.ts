import {
  CONTACT_FIELDS,
  MAX_PHOTO_BYTES,
  contactInputSchema,
  formDataToValues,
  zodFieldErrors,
} from "@/lib/contacts/schema";

const PHOTO = "data:image/png;base64,iVBORw0KGgo=";

function values(overrides: Record<string, unknown> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    company: "",
    job_title: "",
    notes: "",
    photo: "",
    addresses: [],
    ...overrides,
  };
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out the blanks", () => {
    const parsed = contactInputSchema.parse(values());

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("trims what the user typed", () => {
    expect(contactInputSchema.parse(values({ company: "  Acme  " })).company).toBe(
      "Acme",
    );
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: " ", last_name: "", email: "" }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(values({ email: "not-an-email" }));
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("enforces the API's length limits", () => {
    const result = contactInputSchema.safeParse(
      values({
        first_name: "a".repeat(101),
        addresses: [
          {
            type: "Home",
            address: "1 Market St",
            city: "",
            state: "",
            postal_code: "9".repeat(21),
            country: "",
          },
        ],
      }),
    );

    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name must be 100 characters or fewer",
      "addresses.0.postal_code": "Postal code must be 20 characters or fewer",
    });
  });

  it("normalizes nested addresses and defaults to an empty list", () => {
    expect(contactInputSchema.parse(values())).toMatchObject({ addresses: [] });

    expect(
      contactInputSchema.parse(
        values({
          addresses: [
            {
              type: "Work",
              address: "  1 Market St  ",
              city: "  San Francisco ",
              state: "",
              postal_code: "94105",
              country: " US ",
            },
          ],
        }),
      ),
    ).toMatchObject({
      addresses: [
        {
          type: "Work",
          address: "1 Market St",
          city: "San Francisco",
          state: null,
          postal_code: "94105",
          country: "US",
        },
      ],
    });
  });

  it("reports indexed errors for address type, required street, and limits", () => {
    const result = contactInputSchema.safeParse(
      values({
        addresses: [
          {
            type: "Vacation",
            address: " ",
            city: "x".repeat(121),
            state: "",
            postal_code: "",
            country: "",
          },
        ],
      }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toMatchObject({
      "addresses.0.type": "Choose Home, Work, or Other",
      "addresses.0.address": "Street address is required",
      "addresses.0.city": "City must be 120 characters or fewer",
    });
  });

  it("accepts a supported base64 photo and turns an empty photo into null", () => {
    expect(contactInputSchema.parse(values({ photo: PHOTO })).photo).toBe(PHOTO);
    expect(contactInputSchema.parse(values()).photo).toBeNull();
  });

  it("rejects unsupported and malformed photo data", () => {
    const unsupported = contactInputSchema.safeParse(
      values({ photo: "data:image/svg+xml;base64,PHN2Zz4=" }),
    );
    const malformed = contactInputSchema.safeParse(
      values({ photo: "data:image/png;base64,not base64" }),
    );

    expect(zodFieldErrors(unsupported.error!).photo).toMatch(/JPEG, PNG, WebP, or GIF/);
    expect(zodFieldErrors(malformed.error!).photo).toMatch(/valid image/);
  });

  it("rejects photo content that does not match its declared type", () => {
    const spoofed = Buffer.from("GIF89anot-a-png").toString("base64");
    const result = contactInputSchema.safeParse(
      values({ photo: `data:image/png;base64,${spoofed}` }),
    );

    expect(zodFieldErrors(result.error!).photo).toMatch(/does not match/);
  });

  it("rejects a decoded photo larger than two MiB", () => {
    const encoded = Buffer.alloc(MAX_PHOTO_BYTES + 1).toString("base64");
    const result = contactInputSchema.safeParse(
      values({ photo: `data:image/jpeg;base64,${encoded}` }),
    );

    expect(zodFieldErrors(result.error!).photo).toMatch(/2 MiB or smaller/);
  });
});

describe("formDataToValues", () => {
  it("pulls scalar fields and an exact nested address array", () => {
    const formData = new FormData();
    formData.set("first_name", "Grace");
    formData.set("email", "grace@example.com");
    formData.set("photo", PHOTO);
    formData.set("addresses.0.type", "Home");
    formData.set("addresses.0.address", "12 First St");
    formData.set("addresses.0.city", "Oakland");
    formData.set("addresses.0.state", "CA");
    formData.set("addresses.0.postal_code", "94607");
    formData.set("addresses.0.country", "USA");
    formData.set("addresses.1.type", "Other");
    formData.set("addresses.1.address", "PO Box 42");
    formData.set("ignored", "nope");

    const extracted = formDataToValues(formData);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    expect(extracted.photo).toBe(PHOTO);
    expect(extracted).toHaveProperty("addresses", [
      {
        type: "Home",
        address: "12 First St",
        city: "Oakland",
        state: "CA",
        postal_code: "94607",
        country: "USA",
      },
      {
        type: "Other",
        address: "PO Box 42",
        city: "",
        state: "",
        postal_code: "",
        country: "",
      },
    ]);
    expect(extracted).not.toHaveProperty("address");
    expect(Object.keys(extracted).sort()).toEqual([
      ...CONTACT_FIELDS.map((field) => field.name),
      "addresses",
      "photo",
    ].sort());
  });
});
