import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PhotoPicker from "@/components/contacts/PhotoPicker";
import { MAX_PHOTO_BYTES } from "@/lib/contacts/schema";

const CURRENT_PHOTO = "data:image/png;base64,iVBORw0KGgo=";

function hiddenPhoto(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[name="photo"]')!;
}

describe("PhotoPicker", () => {
  it("states the supported formats and size limit", () => {
    render(<PhotoPicker photo={null} />);

    expect(
      screen.getByText("JPEG, PNG, WebP, or GIF. Maximum 2 MiB."),
    ).toBeInTheDocument();
  });

  it("labels the file action as choose or replace based on the current state", () => {
    const { rerender } = render(<PhotoPicker photo={null} />);
    expect(screen.getByRole("button", { name: "Choose photo" })).toBeInTheDocument();

    rerender(<PhotoPicker photo={CURRENT_PHOTO} />);
    expect(screen.getByRole("button", { name: "Replace photo" })).toBeInTheDocument();
  });

  it("puts the visible photo action in the keyboard tab order", async () => {
    const user = userEvent.setup();
    render(<PhotoPicker photo={null} />);

    await user.tab();

    expect(screen.getByRole("button", { name: "Choose photo" })).toHaveFocus();
  });

  it("replaces the current photo with a supported image and can remove it", async () => {
    const { container } = render(<PhotoPicker photo={CURRENT_PHOTO} />);
    const input = screen.getByLabelText("Contact photo");
    const file = new File(
      [new TextEncoder().encode("RIFF1234WEBPphoto")],
      "portrait.webp",
      { type: "image/webp" },
    );

    await userEvent.upload(input, file);

    await waitFor(() =>
      expect(hiddenPhoto(container).value).toMatch(/^data:image\/webp;base64,/),
    );
    expect(screen.getByRole("img", { name: "Contact photo preview" })).toHaveAttribute(
      "src",
      hiddenPhoto(container).value,
    );

    await userEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(hiddenPhoto(container)).toHaveValue("");
    expect(screen.queryByRole("img", { name: "Contact photo preview" })).toBeNull();
  });

  it.each([
    [
      "unsupported type",
      new File(["photo"], "portrait.bmp", { type: "image/bmp" }),
      /JPEG, PNG, WebP, or GIF/,
    ],
    [
      "oversized file",
      new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "portrait.png", {
        type: "image/png",
      }),
      /2 MiB or smaller/,
    ],
  ])("preserves the current photo for an %s", async (_case, file, message) => {
    const user = userEvent.setup({ applyAccept: false });
    const { container } = render(<PhotoPicker photo={CURRENT_PHOTO} />);

    await user.upload(screen.getByLabelText("Contact photo"), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(hiddenPhoto(container)).toHaveValue(CURRENT_PHOTO);
    expect(screen.getByRole("img", { name: "Contact photo preview" })).toHaveAttribute(
      "src",
      CURRENT_PHOTO,
    );
  });

  it("preserves the current photo when file selection is cancelled", () => {
    const { container } = render(<PhotoPicker photo={CURRENT_PHOTO} />);

    fireEvent.change(screen.getByLabelText("Contact photo"), {
      target: { files: [] },
    });

    expect(hiddenPhoto(container)).toHaveValue(CURRENT_PHOTO);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("preserves the current photo and reports a FileReader error", async () => {
    const OriginalFileReader = globalThis.FileReader;
    class FailingFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onabort: ((event: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() {
        this.onerror?.(new ProgressEvent("error") as ProgressEvent<FileReader>);
      }
      abort() {}
    }
    globalThis.FileReader = FailingFileReader as unknown as typeof FileReader;

    try {
      const { container } = render(<PhotoPicker photo={CURRENT_PHOTO} />);
      await userEvent.upload(
        screen.getByLabelText("Contact photo"),
        new File(["photo"], "portrait.gif", { type: "image/gif" }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not read that photo. Please try another file.",
      );
      expect(hiddenPhoto(container)).toHaveValue(CURRENT_PHOTO);
    } finally {
      globalThis.FileReader = OriginalFileReader;
    }
  });

  it("preserves the current photo when content does not match the declared type", async () => {
    const { container } = render(<PhotoPicker photo={CURRENT_PHOTO} />);

    await userEvent.upload(
      screen.getByLabelText("Contact photo"),
      new File(["not a png"], "spoofed.png", { type: "image/png" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Photo content does not match its file type.",
    );
    expect(hiddenPhoto(container)).toHaveValue(CURRENT_PHOTO);
  });

  it("recovers when starting a file read throws synchronously", async () => {
    const OriginalFileReader = globalThis.FileReader;
    const onReadingChange = jest.fn();
    class ThrowingFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onabort: ((event: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() {
        throw new DOMException("unreadable", "NotReadableError");
      }
      abort() {}
    }
    globalThis.FileReader = ThrowingFileReader as unknown as typeof FileReader;

    try {
      const { container } = render(
        <PhotoPicker photo={CURRENT_PHOTO} onReadingChange={onReadingChange} />,
      );
      await userEvent.upload(
        screen.getByLabelText("Contact photo"),
        new File(["GIF89aphoto"], "portrait.gif", { type: "image/gif" }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not read that photo. Please try another file.",
      );
      expect(hiddenPhoto(container)).toHaveValue(CURRENT_PHOTO);
      expect(onReadingChange.mock.calls).toEqual([[true], [false]]);
    } finally {
      globalThis.FileReader = OriginalFileReader;
    }
  });

  it("aborts an in-flight read before rejecting a subsequent invalid file", async () => {
    const OriginalFileReader = globalThis.FileReader;
    const readers: DeferredFileReader[] = [];
    class DeferredFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onabort: ((event: ProgressEvent<FileReader>) => void) | null = null;
      abort = jest.fn();
      constructor() {
        readers.push(this);
      }
      readAsDataURL() {}
    }
    globalThis.FileReader = DeferredFileReader as unknown as typeof FileReader;

    try {
      const user = userEvent.setup({ applyAccept: false });
      const { container } = render(<PhotoPicker photo={CURRENT_PHOTO} />);
      const input = screen.getByLabelText("Contact photo");

      await user.upload(
        input,
        new File(["valid"], "portrait.png", { type: "image/png" }),
      );
      await user.upload(
        input,
        new File(["invalid"], "portrait.bmp", { type: "image/bmp" }),
      );

      expect(readers[0].abort).toHaveBeenCalledTimes(1);
      readers[0].result = "data:image/png;base64,c3RhbGU=";
      readers[0].onload?.(new ProgressEvent("load") as ProgressEvent<FileReader>);
      expect(hiddenPhoto(container)).toHaveValue(CURRENT_PHOTO);
      expect(screen.getByRole("alert")).toHaveTextContent(/JPEG, PNG, WebP, or GIF/);
    } finally {
      globalThis.FileReader = OriginalFileReader;
    }
  });
});
