import type { Metadata } from "next";
import { BookingFlow } from "@/components/BookingFlow";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Boka tid — naglar & fransar i Örebro",
  description:
    "Boka gelénaglar, akryl eller fransförlängning hos Beauty by Sevda i Örebro. Välj dag och tid online.",
};

export default function BokaPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <BookingFlow />
      </main>
      <Footer />
    </>
  );
}
