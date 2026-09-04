import { redirect, notFound } from "next/navigation";
import { getBookingByManageToken, listBookings } from "@/lib/bookings";

type Props = { params: Promise<{ code: string }> };

/**
 * Kort avbokningslänk: /c/xxxxxxxx → /hantera/full-token
 * Syns snyggt i mejl som beautybysevda.se/c/…
 */
export default async function ShortCancelPage({ params }: Props) {
  const { code } = await params;
  const clean = (code || "").trim();
  if (!clean || clean.length < 6) notFound();

  // Exakt token (gamla länkar) eller kort prefix
  const byToken = await getBookingByManageToken(clean);
  if (byToken) {
    redirect(`/hantera/${byToken.manageToken}`);
  }

  const all = await listBookings(true);
  const match = all.find(
    (b) =>
      b.manageToken.startsWith(clean) ||
      b.id.replace(/-/g, "").startsWith(clean),
  );
  if (!match) notFound();
  redirect(`/hantera/${match.manageToken}`);
}
