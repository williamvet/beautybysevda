/** Site-inställningar — telefon syns INTE publikt, bara för SMS till Sevda */

export const siteConfig = {
  brand: "Beauty by Sevda",
  city: "Örebro",
  /** Publik sajt-URL (SEO / Open Graph) */
  siteUrl: "https://beautybysevda.se",
  /** Instagram utan @ */
  instagramHandle: "beautyby.sevda",
  /** TikTok utan @ — ändra om kontot heter något annat */
  tiktokHandle: "beautyby.sevda",
  get instagramUrl() {
    return `https://instagram.com/${this.instagramHandle}`;
  },
  get tiktokUrl() {
    return `https://www.tiktok.com/@${this.tiktokHandle}`;
  },
};
