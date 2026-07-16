import { redirect } from "next/navigation";

/** Merged into the admin Review hub — deep links keep working. */
export default function Redirect() {
  redirect("/admin/review?tab=projects");
}
