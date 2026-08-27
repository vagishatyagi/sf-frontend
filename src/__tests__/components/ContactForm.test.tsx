import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "@/components/contacts/ContactForm";
import { makeContact } from "../mocks/handlers";
import type { FormState } from "@/lib/contacts/types";

const PHOTO = "data:image/png;base64,iVBORw0KGgo=";

function renderForm(action: jest.Mock, contact?: ReturnType<typeof makeContact>) {
  return render(
    <ContactForm
      action={action as never}
      contact={contact}
      submitLabel="Create contact"
      cancelHref="/contacts"
    />,
  );
}

describe("ContactForm", () => {
  it("renders every editable field", () => {
    renderForm(jest.fn());

    expect(screen.getByLabelText(/first name/i)).toBeRequired();
    expect(screen.getByLabelText(/last name/i)).toBeRequired();
    expect(screen.getByLabelText(/^email/i)).toBeRequired();
    expect(screen.getByLabelText(/phone/i)).not.toBeRequired();
    expect(screen.getByLabelText(/notes/i).tagName).toBe("TEXTAREA");
  });

  it("prefills from an existing contact", () => {
    renderForm(jest.fn(), makeContact());

    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
    expect(screen.getByLabelText(/^email/i)).toHaveValue("ada@example.com");
    expect(screen.queryByLabelText(/street address/i)).not.toBeInTheDocument();
  });

  it("starts with no addresses and can add and remove any number", async () => {
    renderForm(jest.fn());

    expect(screen.getByText("No addresses added.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Address 1 street address")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Add address" }));
    await userEvent.selectOptions(screen.getByLabelText("Address 1 type"), "Work");
    await userEvent.type(
      screen.getByLabelText("Address 1 street address"),
      "1 Market St",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add address" }));

    expect(screen.getByLabelText("Address 1 type")).toHaveValue("Work");
    expect(screen.getByLabelText("Address 2 type")).toHaveValue("Home");

    await userEvent.click(
      screen.getByRole("button", { name: "Remove address 1" }),
    );

    expect(screen.getByLabelText("Address 1 type")).toHaveValue("Home");
    expect(screen.queryByLabelText("Address 2 type")).toBeNull();
  });

  it("prefills stored addresses without exposing their database ids", () => {
    const { container } = renderForm(
      jest.fn(),
      makeContact({
        addresses: [
          {
            id: 17,
            type: "Other",
            address: "PO Box 42",
            city: null,
            state: null,
            postal_code: "94607",
            country: "USA",
          },
        ],
      }),
    );

    expect(screen.getByLabelText("Address 1 type")).toHaveValue("Other");
    expect(screen.getByLabelText("Address 1 street address")).toHaveValue(
      "PO Box 42",
    );
    expect(screen.getByLabelText("Address 1 city")).toHaveValue("");
    expect(container.querySelector('input[name="addresses.0.id"]')).toBeNull();
  });

  it("shows an indexed address error on the matching input", async () => {
    const action = jest.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: {
          "addresses.0.address": "Street address is required",
        },
        values: {
          addresses: [
            {
              type: "Home",
              address: "",
              city: "",
              state: "",
              postal_code: "",
              country: "",
            },
          ],
        },
      }),
    );
    renderForm(action);

    await userEvent.click(screen.getByRole("button", { name: "Add address" }));
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    expect(await screen.findByText("Street address is required")).toBeVisible();
    expect(screen.getByLabelText("Address 1 street address")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows the existing photo in an accessible picker and carries its value", () => {
    const { container } = renderForm(jest.fn(), makeContact({ photo: PHOTO }));

    expect(screen.getByLabelText("Contact photo")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp,image/gif",
    );
    expect(screen.getByRole("img", { name: "Contact photo preview" })).toHaveAttribute(
      "src",
      PHOTO,
    );
    expect(container.querySelector('input[name="photo"]')).toHaveValue(PHOTO);
    expect(screen.getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
  });

  it("prevents submission while the selected photo is still being read", async () => {
    const OriginalFileReader = globalThis.FileReader;
    const readers: DeferredFileReader[] = [];
    class DeferredFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onabort: ((event: ProgressEvent<FileReader>) => void) | null = null;
      constructor() {
        readers.push(this);
      }
      readAsDataURL() {}
      abort() {}
    }
    globalThis.FileReader = DeferredFileReader as unknown as typeof FileReader;

    try {
      renderForm(jest.fn());
      await userEvent.upload(
        screen.getByLabelText("Contact photo"),
        new File(["photo"], "portrait.png", { type: "image/png" }),
      );

      expect(screen.getByRole("button", { name: "Create contact" })).toBeDisabled();

      act(() => {
        readers[0].result = PHOTO;
        readers[0].onload?.(new ProgressEvent("load") as ProgressEvent<FileReader>);
      });
      expect(screen.getByRole("button", { name: "Create contact" })).toBeEnabled();
    } finally {
      globalThis.FileReader = OriginalFileReader;
    }
  });

  it("submits the entered values to the action", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action);

    await userEvent.type(screen.getByLabelText(/first name/i), "Grace");
    await userEvent.type(screen.getByLabelText(/last name/i), "Hopper");
    await userEvent.type(screen.getByLabelText(/^email/i), "grace@example.com");
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());

    const formData = action.mock.calls[0][1];
    expect(formData.get("first_name")).toBe("Grace");
    expect(formData.get("email")).toBe("grace@example.com");
  });

  it("submits an existing photo and nested addresses on an edit", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(
      action,
      makeContact({
        photo: PHOTO,
        addresses: [
          {
            id: 9,
            type: "Home",
            address: "12 First St",
            city: "Oakland",
            state: "CA",
            postal_code: "94607",
            country: "USA",
          },
        ],
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));
    await waitFor(() => expect(action).toHaveBeenCalled());

    const submitted = action.mock.calls[0][1];
    expect(submitted.get("photo")).toBe(PHOTO);
    expect(submitted.get("addresses.0.type")).toBe("Home");
    expect(submitted.get("addresses.0.address")).toBe("12 First St");
    expect(submitted.has("addresses.0.id")).toBe(false);
  });

  it("shows the summary and the per-field errors the action returns", async () => {
    const action = jest.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "That email address is already taken.",
        fieldErrors: { email: "This email is already in use." },
        values: { first_name: "Grace" },
      }),
    );
    renderForm(action);

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((node) => node.textContent)).toEqual(
      expect.arrayContaining([
        "That email address is already taken.",
        "This email is already in use.",
      ]),
    );
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("links back out without submitting", () => {
    renderForm(jest.fn());
    expect(screen.getByRole("link", { name: /cancel/i })).toHaveAttribute(
      "href",
      "/contacts",
    );
  });
});
