import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toDataURL } from "qrcode";
import type { QRCodeToDataURLOptions } from "qrcode";
import ContactShareButton from "@/components/contacts/ContactShareButton";
import { makeContact } from "../mocks/handlers";

jest.mock(
  "qrcode",
  () => ({ toDataURL: jest.fn() }),
  { virtual: true },
);

const mockToDataURL = toDataURL as unknown as jest.MockedFunction<
  (text: string, options?: QRCodeToDataURLOptions) => Promise<string>
>;

describe("ContactShareButton", () => {
  beforeEach(() => {
    mockToDataURL.mockReset();
  });

  it("reveals a scannable QR code and downloadable vCard", async () => {
    mockToDataURL.mockResolvedValue("data:image/png;base64,qr-code");
    const contact = makeContact();

    render(<ContactShareButton contact={contact} />);
    await userEvent.click(screen.getByRole("button", { name: "Share contact" }));

    expect(
      await screen.findByRole("img", { name: "QR code for Ada Lovelace" }),
    ).toHaveAttribute("src", "data:image/png;base64,qr-code");
    expect(mockToDataURL).toHaveBeenCalledWith(
      expect.stringContaining("FN:Ada Lovelace"),
      expect.objectContaining({ errorCorrectionLevel: "M", width: 256 }),
    );

    const download = screen.getByRole("link", { name: "Download vCard" });
    expect(download).toHaveAttribute("download", "ada-lovelace.vcf");
    expect(download.getAttribute("href")).toMatch(/^data:text\/vcard/);
  });

  it("keeps the vCard download available when QR generation fails", async () => {
    mockToDataURL.mockRejectedValue(new Error("payload too large"));

    render(<ContactShareButton contact={makeContact()} />);
    await userEvent.click(screen.getByRole("button", { name: "Share contact" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not create the QR code",
    );
    expect(
      screen.getByRole("link", { name: "Download vCard" }),
    ).toBeInTheDocument();
  });
});
