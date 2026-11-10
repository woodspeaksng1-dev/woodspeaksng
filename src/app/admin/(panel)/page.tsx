import type { Metadata } from "next";
import { Overview } from "@/components/admin/Overview";

export const metadata: Metadata = { title: { absolute: "Admin | Woodspeaks" } };

export default function AdminHome() {
  return <Overview />;
}
