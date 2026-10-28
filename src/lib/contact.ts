/**
 * Public contact details. TO CONFIRM with the client (asset list marks these pending);
 * current values are from their live site.
 */
const PHONE = "2348082589006";

export const CONTACT = {
  phoneDisplay: "+234 808 258 9006",
  instagramHandle: "@woodspeaks_ng",
  instagramUrl: "https://www.instagram.com/woodspeaks_ng",
  whatsappUrl: (message?: string) =>
    `https://wa.me/${PHONE}${message ? `?text=${encodeURIComponent(message)}` : ""}`,
};
