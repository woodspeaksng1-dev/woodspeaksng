import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin | Woodspeaks" },
  robots: { index: false, follow: false },
};

// Staff pages live in (panel), behind the sign-in check; /admin/login sits outside it.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-parchment">{children}</div>;
}
