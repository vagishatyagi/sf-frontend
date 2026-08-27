import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { makeContact } from "../mocks/handlers";

const PHOTO = "data:image/png;base64,iVBORw0KGgo=";

describe("ContactAvatar", () => {
  it("renders a circular, cropped contact photo", () => {
    const { container } = render(
      <ContactAvatar contact={makeContact({ photo: PHOTO })} size="lg" />,
    );

    const image = container.querySelector("img")!;
    expect(image).toHaveAttribute("src", PHOTO);
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveClass("aspect-square", "rounded-full", "object-cover");
    expect(screen.queryByText("AL")).toBeNull();
  });

  it("uses initials when there is no photo", () => {
    render(<ContactAvatar contact={makeContact({ photo: null })} />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("falls back to initials when the stored photo cannot load", () => {
    const { container } = render(
      <ContactAvatar contact={makeContact({ photo: PHOTO })} />,
    );

    fireEvent.error(container.querySelector("img")!);

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });
});
