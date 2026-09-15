import type { ReactNode } from "react";
import { siteConfig } from "@/lib/site";

/** Länk till Google-recension — visas bara om URL är satt. */
export function ReviewLink({
  className,
  children = "Lämna en recension",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const href = siteConfig.googleReviewUrl;
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
