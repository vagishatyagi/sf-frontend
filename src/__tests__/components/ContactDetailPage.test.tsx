import { render, screen } from "@testing-library/react";
import ContactDetailPage from "@/app/contacts/[id]/page";
import { getContact } from "@/lib/contacts/api";
import { makeContact } from "../mocks/handlers";

jest.mock("@/lib/contacts/api", () => ({
  getContact: jest.fn(),
}));

jest.mock("@/app/contacts/actions", () => ({
  deleteContactAction: jest.fn(async () => ({})),
}));

const mockGetContact = jest.mocked(getContact);

async function renderPage(contact = makeContact()) {
  mockGetContact.mockResolvedValue(contact);
  render(
    await ContactDetailPage({ params: Promise.resolve({ id: String(contact.id) }) }),
  );
}

describe("ContactDetailPage addresses", () => {
  it("shows an address empty state", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { level: 2, name: "Addresses" }),
    ).toBeVisible();
    expect(screen.getByText("No addresses added.")).toBeVisible();
    expect(document.querySelectorAll("address")).toHaveLength(0);
  });

  it("groups semantic address cards in Home, Work, Other order", async () => {
    await renderPage(
      makeContact({
        addresses: [
          {
            id: 3,
            type: "Other",
            address: "PO Box 42",
            city: null,
            state: null,
            postal_code: null,
            country: "USA",
          },
          {
            id: 1,
            type: "Home",
            address: "12 First St",
            city: "Oakland",
            state: "CA",
            postal_code: "94607",
            country: "USA",
          },
          {
            id: 2,
            type: "Work",
            address: "1 Market St",
            city: "San Francisco",
            state: "CA",
            postal_code: "94105",
            country: "USA",
          },
        ],
      }),
    );

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Home", "Work", "Other"]);

    const cards = [...document.querySelectorAll("address")];
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining("12 First St"),
      expect.stringContaining("1 Market St"),
      expect.stringContaining("PO Box 42"),
    ]);
    expect(cards[0]).toHaveTextContent("Home");
    expect(cards[1]).toHaveTextContent("Work");
    expect(cards[2]).toHaveTextContent("Other");
  });
});
