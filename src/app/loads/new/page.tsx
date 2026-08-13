import { redirect } from "next/navigation";

export default function PublicLoadNewRedirectPage() {
  redirect("/cargo-owner/cargo-posts/new");
}
