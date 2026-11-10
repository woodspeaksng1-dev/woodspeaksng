import type { EnquiryRequest } from "@/lib/enquiry";

/** Sends a validated enquiry to /api/enquiry. Never throws; a failure comes back as { ok: false }. */
export async function postEnquiry(body: EnquiryRequest): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch("/api/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: res.ok, message: data.message ?? "We couldn't send that. Try again, or message us on WhatsApp." };
  } catch {
    return { ok: false, message: "We couldn't send that. Check your connection and try again, or message us on WhatsApp." };
  }
}
