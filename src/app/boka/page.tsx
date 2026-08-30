import { BookingFlow } from "@/components/BookingFlow";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

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
