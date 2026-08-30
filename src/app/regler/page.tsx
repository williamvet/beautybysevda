import { CareInfo } from "@/components/CareInfo";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "Bokningsregler — Beauty by Sevda",
  description:
    "Bokningsregler, nagelvård och eftervård för fransar hos Beauty by Sevda.",
};

export default function ReglerPage() {
  return (
    <>
      <Nav />
      <main>
        <CareInfo />
      </main>
      <Footer />
    </>
  );
}
