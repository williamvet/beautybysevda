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
  /**
   * Google “Skriv en recension”-länk (från Google Företagsprofil).
   * Kan överskrivas med NEXT_PUBLIC_GOOGLE_REVIEW_URL.
   */
  get googleReviewUrl() {
    return (
      process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL?.trim() ||
      "https://g.page/r/CZBtueLCAFF-EBM/review"
    );
  },
  get instagramUrl() {
    return `https://instagram.com/${this.instagramHandle}`;
  },
  get tiktokUrl() {
    return `https://www.tiktok.com/@${this.tiktokHandle}`;
  },
};
