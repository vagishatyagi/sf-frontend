import {
  contactVCardFilename,
  serializeContactVCard,
} from "@/lib/contacts/vcard";
import { makeContact } from "../../mocks/handlers";

describe("serializeContactVCard", () => {
  it("serializes a contact as an importable vCard", () => {
    const result = serializeContactVCard(
      makeContact({
        address: "1 Engine Way",
        postal_code: "94105",
        notes: "Met at Qodo",
      }),
    );

    expect(result).toContain("BEGIN:VCARD\r\nVERSION:3.0\r\n");
    expect(result).toContain("N:Lovelace;Ada;;;\r\n");
    expect(result).toContain("FN:Ada Lovelace\r\n");
    expect(result).toContain("EMAIL;TYPE=INTERNET:ada@example.com\r\n");
    expect(result).toContain("TEL;TYPE=CELL:+1-415-555-0101\r\n");
    expect(result).toContain(
      "ADR;TYPE=HOME:;;1 Engine Way;San Francisco;CA;94105;USA\r\n",
    );
    expect(result).toContain("NOTE:Met at Qodo\r\n");
    expect(result).toMatch(/END:VCARD\r\n$/);
  });

  it("escapes reserved characters and creates a safe filename", () => {
    const contact = makeContact({
      first_name: "Ada; Augusta",
      last_name: "Lovelace, Byron",
      full_name: "Ada; Augusta Lovelace, Byron",
      notes: "Line one\nLine two \\ archived",
    });

    const result = serializeContactVCard(contact);

    expect(result).toContain(
      "N:Lovelace\\, Byron;Ada\\; Augusta;;;\r\n",
    );
    expect(result).toContain("NOTE:Line one\\nLine two \\\\ archived\r\n");
    expect(contactVCardFilename(contact)).toBe("ada-augusta-lovelace-byron.vcf");
  });

  it("can omit notes to keep a QR payload reliably scannable", () => {
    const result = serializeContactVCard(
      makeContact({ notes: "A".repeat(10_000) }),
      { includeNotes: false },
    );

    expect(result).not.toContain("NOTE:");
    expect(result.length).toBeLessThan(2_000);
  });
});
