import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountDashboard } from "@/components/account/AccountDashboard";
import { SignInForm } from "@/components/auth/SignInForm";
import { currentCustomer } from "@/lib/server/customer-session";
import { getCustomerProfile, listCustomerOrders } from "@/lib/server/customers";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 lg:px-10">
      <Suspense fallback={<p className="py-24 text-center text-ink-soft">Opening your account…</p>}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  const person = await currentCustomer();
  if (!person)
    return (
      <div className="mx-auto max-w-sm py-8">
        <h1 className="text-4xl text-oxblood md:text-5xl">Your account</h1>
        <p className="mt-3 text-ink-soft">
          See your orders and save addresses for next time. No password: sign in with Google, or we&rsquo;ll email you a link.
          Orders you&rsquo;ve already placed with your email will be there.
        </p>
        <SignInForm sessionUrl="/api/account/session" linkUrl="/api/account/login-link" after="/account" emailKey="ws-account-email" />
      </div>
    );
  const [orders, profile] = await Promise.all([listCustomerOrders(person.email), getCustomerProfile(person)]);
  return <AccountDashboard orders={orders} profile={profile} />;
}
