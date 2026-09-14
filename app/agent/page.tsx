import { redirect } from "next/navigation";

export default function RemovedAgentPage() {
  redirect("/login");
}
