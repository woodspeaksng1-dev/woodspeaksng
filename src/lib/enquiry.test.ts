import { describe, expect, it } from "vitest";
import { contactSchema, enquiryRequestSchema, enquirySchema, type ContactInput, type EnquiryInput } from "./enquiry";

// What the forms hold as the buyer types (all text), and so what they send.
const corporate: EnquiryInput = {
  company: "Acme Ltd",
  name: "Femi Bello",
  email: "Femi@Acme.test",
  phone: "",
  quantity: "40",
  budget: "20k-50k",
  dateNeeded: "2030-12-02",
  message: "End of year gifts.",
  website: "",
};
const contact: ContactInput = { name: "Ngozi Eze", email: "ngozi@example.com", phone: "", message: "Do you deliver to Ikorodu?", website: "" };

describe("what the enquiry forms send", () => {
  it("the server accepts the forms' fields as typed", () => {
    expect(enquirySchema.safeParse(corporate).success).toBe(true); // the form's own check passes
    expect(enquiryRequestSchema.safeParse({ kind: "corporate", ...corporate }).success).toBe(true);
    expect(contactSchema.safeParse(contact).success).toBe(true);
    expect(enquiryRequestSchema.safeParse({ kind: "contact", ...contact }).success).toBe(true);
  });

  it("the browser's parsed copy is not what to send (it was, and corporate enquiries failed)", () => {
    const parsed = enquirySchema.parse(corporate);
    expect(typeof parsed.quantity).toBe("number");
    expect(enquiryRequestSchema.safeParse({ kind: "corporate", ...parsed }).success).toBe(false);
  });
});
