import { redirect } from "next/navigation";

// La página se renombró a «Links» (spec cantados 2026-10-26 §5).
export default function LinksDm() {
  redirect("/admin/links");
}
