import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Contact and corporate enquiries against the Firestore emulator (npm run test:emulator): the real route,
 * store and admin action. Stood in for: the email sender, and who is signed in to admin.
 */

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string };
const mail = vi.hoisted(() => ({ send: vi.fn<(m: Mail) => Promise<void>>(async () => {}) }));
vi.mock("@/lib/server/email", async (original) => ({ ...(await original<typeof import("@/lib/server/email")>()), sendEmail: mail.send }));
const session = vi.hoisted(() => ({ staff: null as null | { uid: string; email: string; role: "owner" | "staff"; name: string | null } }));
vi.mock("@/lib/server/admin-session", () => ({ currentStaff: async () => session.staff, requireStaff: async () => session.staff }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));

process.env.ORDER_NOTIFICATION_EMAIL = "team@woodspeaks.test";

const { db } = await import("@/lib/server/firebase");
const { listEnquiries } = await import("@/lib/server/enquiries");
const route = await import("@/app/api/enquiry/route");
const actions = await import("@/app/admin/(panel)/enquiries/actions");

const ORIGIN = "http://localhost";
let ip = 0;
// Our forms send how long the page was open; a person takes well over MIN_FILL_MS.
const post = (body: object, headers: Record<string, string> = {}, sameIp?: string) =>
  route.POST(
    new Request(`${ORIGIN}/api/enquiry`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": sameIp ?? `10.3.0.${++ip}`, ...headers },
      body: JSON.stringify({ openedFor: 45_000, ...body }),
    }),
  );

const contact = { kind: "contact", name: "Ngozi Eze", email: "Ngozi@Example.com", phone: "", message: "Can you deliver to Ikorodu on Saturday?", website: "" };
const corporate = {
  kind: "corporate",
  company: "Acme <Ltd>",
  name: "Femi Bello",
  email: "femi@acme.test",
  phone: "08030000000",
  quantity: "40",
  budget: "20k-50k",
  dateNeeded: "2030-12-01",
  message: "End of year gifts for staff.",
  website: "",
};

const stored = async () => (await db().collection("enquiries").get()).docs.map((d) => d.data());

beforeEach(async () => {
  mail.send.mockClear();
  session.staff = null;
  const snap = await db().collection("enquiries").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
});

describe("sending an enquiry", () => {
  it("saves a contact message and emails the team, with replies going to the sender", async () => {
    expect((await post(contact)).status).toBe(200);
    const [saved] = await stored();
    expect(saved).toMatchObject({ kind: "contact", email: "ngozi@example.com", status: "new", handledBy: null });
    expect(saved).not.toHaveProperty("website");
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: "team@woodspeaks.test", replyTo: "ngozi@example.com" }));
  });

  it("saves a corporate enquiry with numbers as numbers, and escapes what was typed in the email", async () => {
    expect((await post(corporate)).status).toBe(200);
    const [saved] = await stored();
    expect(saved).toMatchObject({ kind: "corporate", quantity: 40, budget: "20k-50k" });
    const html = mail.send.mock.calls[0][0].html;
    expect(html).toContain("Acme &lt;Ltd&gt;");
    expect(html).not.toContain("<Ltd>");
  });

  it("refuses bad input and other websites, and saves nothing", async () => {
    expect((await post({ ...contact, message: "hi" })).status).toBe(400);
    expect((await post({ ...corporate, budget: "free" })).status).toBe(400);
    expect((await post({ ...contact, kind: "order" })).status).toBe(400);
    expect((await post(contact, { origin: "https://evil.example" })).status).toBe(403);
    expect(await stored()).toHaveLength(0);
  });

  it("quietly drops bot submissions (filled honeypot)", async () => {
    expect((await post({ ...contact, website: "http://spam.example" })).status).toBe(200);
    expect(await stored()).toHaveLength(0);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it("quietly drops messages sent faster than anyone could type, and refuses posts not from our forms", async () => {
    expect((await post({ ...contact, openedFor: 800 })).status).toBe(200);
    expect((await post({ ...contact, openedFor: undefined })).status).toBe(400);
    expect((await post({ ...contact, openedFor: "45000" })).status).toBe(400);
    expect(await stored()).toHaveLength(0);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it("refuses a list of links but takes a message with one or two", async () => {
    const spam = "Cheap SEO https://seo.example/a http://rank.example www.links.example buy now";
    expect((await post({ ...contact, message: spam })).status).toBe(400);
    expect((await post({ ...corporate, message: `See ${spam}` })).status).toBe(400);
    expect(await stored()).toHaveLength(0);
    expect((await post({ ...contact, message: "Like the one on https://acme.com? Email me at ada@gmail.com" })).status).toBe(200);
    expect(await stored()).toHaveLength(1);
  });

  it("allows five an hour per visitor", async () => {
    for (let i = 0; i < 5; i++) expect((await post(contact, {}, "10.3.9.9")).status).toBe(200);
    expect((await post(contact, {}, "10.3.9.9")).status).toBe(429);
    expect(await stored()).toHaveLength(5);
  });
});

describe("handling enquiries in admin", () => {
  it("staff mark one handled and back, and it's logged", async () => {
    await post(contact);
    const [q] = await listEnquiries();
    session.staff = { uid: "s1", email: "tolu@woodspeaks.test", role: "staff", name: "Tolu" };
    expect((await actions.markEnquiry(q.id, true)).ok).toBe(true);
    expect((await listEnquiries())[0]).toMatchObject({ status: "handled", handledBy: "tolu@woodspeaks.test" });
    expect((await actions.markEnquiry(q.id, false)).ok).toBe(true);
    expect((await listEnquiries())[0]).toMatchObject({ status: "new", handledBy: null });
    const log = await db().collection("auditLog").where("by", "==", "tolu@woodspeaks.test").get();
    expect(log.docs.map((d) => d.get("action"))).toEqual(expect.arrayContaining(["Marked enquiry handled", "Reopened enquiry"]));
  });

  it("does nothing when signed out or for an unknown enquiry", async () => {
    await post(contact);
    const [q] = await listEnquiries();
    expect((await actions.markEnquiry(q.id, true)).message).toMatch(/Sign in/);
    session.staff = { uid: "s1", email: "tolu@woodspeaks.test", role: "staff", name: "Tolu" };
    expect((await actions.markEnquiry("not-an-id", true)).ok).toBe(false);
    expect((await actions.markEnquiry("00000000-0000-4000-8000-000000000000", true)).ok).toBe(false);
    expect((await listEnquiries())[0].status).toBe("new");
  });
});
