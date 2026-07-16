import { redirect } from "next/navigation";

/** Merged into the seller Operations hub — deep links keep working. */
export default function Redirect() {
  redirect("/seller/operations?tab=shipping");
}
