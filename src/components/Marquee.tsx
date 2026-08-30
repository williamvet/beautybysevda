const items = [
  "Naglar",
  "Fransar",
  "Gelé",
  "Akryl",
  "Singel",
  "Mix",
  "Volym",
  "Beauty by Sevda",
];

export function Marquee() {
  const row = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden border-y border-line bg-bg-soft py-4"
      aria-hidden
    >
      <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
        {row.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="flex items-center gap-10 font-display text-2xl text-ink/80 md:text-3xl"
          >
            {label}
            <span className="text-gold">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
