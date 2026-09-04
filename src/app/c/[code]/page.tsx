import { redirect, notFound } from "next/navigation";
import { getBookingByManageTokenPrefix } from "@/lib/bookings";

type Props = { params: Promise<{ code: string }> };

/**
 * Kort avbokningslänk: /c/xxxxxxxx → /hantera/full-token
 */
export default async function ShortCancelPage({ params }: Props) {
  const { code } = await params;
  const clean = (code || "").trim();
  if (!clean || clean.length < 6) notFound();

  const match = await getBookingByManageTokenPrefix(clean);
  if (!match) notFound();
  redirect(`/hantera/${match.manageToken}`);
}
