"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, isSignInWithEmailLink, signInWithEmailLink, signInWithPopup, signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";

/*
 * Staff sign-in: Google, or a one-time link by email. Either way Firebase proves the email, then our
 * server checks it's on the team and sets the admin session. The Firebase sign-in in this browser is
 * ended straight after (the session cookie is what counts), so nothing lingers in the browser.
 */

const EMAIL_KEY = "ws-admin-email";

async function startSession(idToken: string): Promise<string | null> {
  const res = await fetch("/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  return data.message ?? "That sign-in didn't work. Try again.";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkFlow, setLinkFlow] = useState(false);

  const finish = async (idToken: string) => {
    const error = await startSession(idToken);
    await signOut(await firebaseAuth()).catch(() => {});
    if (error) {
      setStatus({ tone: "error", text: error });
      setBusy(false);
      return;
    }
    try {
      localStorage.removeItem(EMAIL_KEY);
    } catch {}
    router.replace("/admin");
    router.refresh();
  };

  const completeLink = async (address: string) => {
    setBusy(true);
    setStatus({ tone: "info", text: "Signing you in…" });
    try {
      const auth = await firebaseAuth();
      const cred = await signInWithEmailLink(auth, address.trim(), window.location.href);
      window.history.replaceState(null, "", "/admin/login");
      await finish(await cred.user.getIdToken());
    } catch {
      setStatus({ tone: "error", text: "That link has expired or was already used. Ask for a new one below." });
      setLinkFlow(false);
      setBusy(false);
    }
  };

  // Arriving from the emailed link: finish signing in.
  useEffect(() => {
    (async () => {
      const auth = await firebaseAuth();
      if (!isSignInWithEmailLink(auth, window.location.href)) return;
      setLinkFlow(true);
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(EMAIL_KEY);
      } catch {}
      if (!saved) {
        setStatus({ tone: "info", text: "Confirm your email to finish signing in." });
        return;
      }
      await completeLink(saved);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const google = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const cred = await signInWithPopup(await firebaseAuth(), new GoogleAuthProvider());
      await finish(await cred.user.getIdToken());
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      setStatus(
        code.includes("popup-closed") || code.includes("cancelled")
          ? null
          : { tone: "error", text: "Google sign-in didn't work. Try again, or use an email link." },
      );
      setBusy(false);
    }
  };

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (linkFlow) return completeLink(email);
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/admin/login-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { message?: string }) : {};
    if (res?.ok) {
      try {
        localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
      } catch {}
      setStatus({ tone: "info", text: data.message ?? "Check your email for the link." });
    } else {
      setStatus({ tone: "error", text: data.message ?? "We couldn't send the link. Try again." });
    }
    setBusy(false);
  };

  return (
    <div className="mt-8 flex flex-col gap-6">
      {!linkFlow && (
        <>
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="h-12 rounded-full border border-ink/30 bg-vellum text-ink transition-colors hover:border-oxblood disabled:opacity-50"
          >
            Continue with Google
          </button>
          <p className="text-center text-sm text-ink-soft">or</p>
        </>
      )}
      <form onSubmit={requestLink} className="flex flex-col gap-3">
        <label htmlFor="admin-email" className="text-sm text-ink">
          {linkFlow ? "Your email" : "Email me a sign-in link"}
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 rounded-xl border border-rule bg-vellum px-3.5 text-ink outline-none focus:border-oxblood"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="h-12 rounded-full bg-oxblood text-vellum transition-colors hover:bg-wine disabled:opacity-50"
        >
          {linkFlow ? "Finish signing in" : "Email me a link"}
        </button>
      </form>
      {status && (
        <p role={status.tone === "error" ? "alert" : "status"} className={`text-sm ${status.tone === "error" ? "text-oxblood" : "text-ink"}`}>
          {status.text}
        </p>
      )}
    </div>
  );
}
