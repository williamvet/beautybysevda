import { Footer } from "@/components/Footer";
import { GalleryGrid } from "@/components/Gallery";
import { Hero } from "@/components/Hero";
import { LocalBusinessJsonLd } from "@/components/LocalBusinessJsonLd";
import { Marquee } from "@/components/Marquee";
import { Nav } from "@/components/Nav";
import { Services } from "@/components/Services";
import { SoftBridge } from "@/components/SoftBridge";
import { galleryPreview } from "@/data/gallery";

export default function Home() {
  return (
    <>
      <LocalBusinessJsonLd />
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Services />
        <SoftBridge />
        <GalleryGrid
          items={galleryPreview}
          title="Galleri"
          subtitle="Ett smakprov"
          moreHref="/galleri"
        />
      </main>
      <Footer />
    </>
  );
}
