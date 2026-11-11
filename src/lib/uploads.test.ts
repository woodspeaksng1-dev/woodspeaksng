import { describe, expect, it } from "vitest";
import { whatsappToCustomer } from "./contact";
import { PHOTO_MAX_BYTES, fileProblem, fileStillNeeded, sendFileMessage } from "./uploads";

describe("customer files", () => {
  it("knows which files still have to come on WhatsApp", () => {
    expect(fileStillNeeded({ kind: "photo", photoNames: ["a.jpg"] })).toBe("photo");
    expect(fileStillNeeded({ kind: "photo", photoNames: ["a.jpg"], uploadIds: ["0b6a1c5e-8f3e-4f6a-9d0b-1a2b3c4d5e6f"] })).toBeNull();
    expect(fileStillNeeded({ kind: "video", source: "file", fileName: "v.mp4", sizeMb: 3 })).toBe("video");
    expect(fileStillNeeded({ kind: "video", source: "link", url: "https://youtu.be/x" })).toBeNull();
    expect(fileStillNeeded({ kind: "letter", text: "Hi" })).toBeNull();
  });

  it("only takes photo and video types, within the limit", () => {
    expect(fileProblem("photo", "image/jpeg", 1000, PHOTO_MAX_BYTES)).toBeNull();
    expect(fileProblem("photo", "image/svg+xml", 1000, PHOTO_MAX_BYTES)).toMatch(/JPG/);
    expect(fileProblem("photo", "image/jpeg", PHOTO_MAX_BYTES + 1, PHOTO_MAX_BYTES)).toMatch(/15 MB/);
    expect(fileProblem("video", "text/html", 10, 100 * 1024 * 1024)).toMatch(/MP4/);
  });

  it("writes the WhatsApp messages", () => {
    expect(sendFileMessage("WS-ABC123", [{ name: "Locket", kind: "photo" }])).toBe("Hello Woodspeaks, here is the photo for the Locket on order WS-ABC123.");
    expect(whatsappToCustomer("0803 123 4567", "Hi")).toBe("https://wa.me/2348031234567?text=Hi");
    expect(whatsappToCustomer("+234 803 123 4567", "Hi")).toBe("https://wa.me/2348031234567?text=Hi");
    expect(whatsappToCustomer("12345", "Hi")).toBeNull();
  });
});
