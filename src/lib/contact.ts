/** Public contact details: the official WhatsApp line and Instagram, confirmed by the client 4 Nov. */
const PHONE = "2347070885263";

export const CONTACT = {
  phoneDisplay: "0707 088 5263",
  instagramHandle: "@woodspeaks_nigeria",
  instagramUrl: "https://www.instagram.com/woodspeaks_nigeria",
  whatsappUrl: (message?: string) =>
    `https://wa.me/${PHONE}${message ? `?text=${encodeURIComponent(message)}` : ""}`,
};

/** A WhatsApp chat with a customer's Nigerian number (080…, +234…, 234…), or null if it doesn't look like one. */
export function whatsappToCustomer(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("234") ? digits : digits.startsWith("0") ? `234${digits.slice(1)}` : null;
  return intl && intl.length === 13 ? `https://wa.me/${intl}?text=${encodeURIComponent(message)}` : null;
}
