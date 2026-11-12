import { HOME_MOMENTS } from "@/lib/gallery";
import { getPublicMoments } from "@/lib/server/moments";
import { MomentsStack } from "./MomentsStack";

/** The home page's customer moments: the first few that staff have put up in admin. None, no section. */
export async function Moments() {
  const moments = (await getPublicMoments()).slice(0, HOME_MOMENTS);
  return moments.length ? <MomentsStack moments={moments} /> : null;
}
