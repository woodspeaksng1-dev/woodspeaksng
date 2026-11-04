/** Public contact details: the official WhatsApp line and Instagram, confirmed by the client 4 Nov. */
const PHONE = "2347070885263";

export const CONTACT = {
  phoneDisplay: "0707 088 5263",
  instagramHandle: "@woodspeaks_nigeria",
  instagramUrl: "https://www.instagram.com/woodspeaks_nigeria",
  whatsappUrl: (message?: string) =>
    `https://wa.me/${PHONE}${message ? `?text=${encodeURIComponent(message)}` : ""}`,
};
