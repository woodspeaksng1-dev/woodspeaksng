import type { Metadata } from "next";
import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-28 sm:px-6 lg:px-10">
      <AccountView />
    </div>
  );
}
