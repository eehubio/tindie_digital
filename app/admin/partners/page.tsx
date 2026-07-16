import { redirect } from "next/navigation";

/** Merged into the admin hubs — deep links keep working. */
export default function Redirect() {
  redirect("/admin/config?tab=partners");
}
