import { ShopFrame } from "@/components/layout/ShopFrame";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <ShopFrame>{children}</ShopFrame>;
}
