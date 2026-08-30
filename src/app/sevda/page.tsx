import { redirect } from "next/navigation";

/** Gammal länk → enklare adress */
export default function SevdaRedirect() {
  redirect("/schema");
}
