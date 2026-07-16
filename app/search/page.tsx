import { redirect } from "next/navigation";

/** Browse merged into the marketplace front page — the search box IS home. */
export default function SearchRedirect() {
  redirect("/");
}
