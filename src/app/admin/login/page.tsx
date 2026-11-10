import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-16">
      <p className="font-display text-3xl text-oxblood italic">Woodspeaks</p>
      <h1 className="mt-6 text-4xl text-oxblood">Staff sign-in</h1>
      <p className="mt-3 text-ink-soft">For the Woodspeaks team. Sign in with the email the owner added.</p>
      <SignInForm sessionUrl="/api/admin/session" linkUrl="/api/admin/login-link" after="/admin" emailKey="ws-admin-email" />
    </main>
  );
}
