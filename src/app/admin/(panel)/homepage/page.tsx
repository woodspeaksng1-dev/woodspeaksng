import { redirect } from "next/navigation";

/** The old Homepage section: featured products are set on each product; moments have their own page. */
export default function Page() {
  redirect("/admin/moments");
}
