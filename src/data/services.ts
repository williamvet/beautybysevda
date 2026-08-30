export type ServiceCategory = "naglar" | "fransar";

export type Service = {
  id: string;
  category: ServiceCategory;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  note?: string;
};

/** Ca 2 tim per behandling — passar schema 10:00 / 12:15 / 14:30 / 16:45 */
const T = 120;

/**
 * Priser i nybörjarfas — rimliga, max ca 300 kr.
 * Baserat på Sevdas Instagram-prislista + gelénaglar.
 */
export const services: Service[] = [
  {
    id: "gele-nytt",
    category: "naglar",
    name: "Gelénaglar — nytt set",
    description: "Formning, uppbyggnad och lack i vald färg. Hållbart och blankt resultat.",
    durationMinutes: T,
    price: 280,
  },
  {
    id: "gele-fyllning",
    category: "naglar",
    name: "Gelénaglar — påfyllning",
    description: "Påfyllning av befintligt set när tillväxten syns.",
    durationMinutes: T,
    price: 220,
  },
  {
    id: "akryl-nytt",
    category: "naglar",
    name: "Akryl — nytt set",
    description: "Starkare uppbyggnad med akryl. Bra för längd och hållbarhet.",
    durationMinutes: T,
    price: 250,
  },
  {
    id: "akryl-fyllning",
    category: "naglar",
    name: "Akryl — påfyllning",
    description: "Påfyllning och formkorrigering av akryl.",
    durationMinutes: T,
    price: 200,
  },
  {
    id: "nagelborttagning",
    category: "naglar",
    name: "Borttagning naglar",
    description: "Skonsam borttagning av gelé eller akryl + lätt vård av naturnageln.",
    durationMinutes: T,
    price: 150,
  },
  {
    id: "singelfransar",
    category: "fransar",
    name: "Singel — nytt set",
    description: "En frans på varje egen frans. Naturlig och elegant.",
    durationMinutes: T,
    price: 200,
  },
  {
    id: "mixfransar",
    category: "fransar",
    name: "Mix — nytt set",
    description: "Mix av singel och lätt volym för mer täthet där det behövs.",
    durationMinutes: T,
    price: 250,
  },
  {
    id: "volymfransar",
    category: "fransar",
    name: "Volym — nytt set",
    description: "Flera lätta fransar per naturbas. Mjuk, fyllig look.",
    durationMinutes: T,
    price: 300,
  },
  {
    id: "fransfyllning-volym",
    category: "fransar",
    name: "Påfyllning volym",
    description: "Påfyllning av volymfransar. Behåller formen och tätheten.",
    durationMinutes: T,
    price: 250,
    note: "Bäst inom 2–3 veckor från föregående behandling.",
  },
  {
    id: "fransfyllning-singel",
    category: "fransar",
    name: "Påfyllning singel",
    description: "Påfyllning av singelfransar.",
    durationMinutes: T,
    price: 150,
    note: "Bäst inom 2–3 veckor från föregående behandling.",
  },
];

export const categoryMeta: Record<
  ServiceCategory,
  { title: string; subtitle: string; maxPerDay: number }
> = {
  naglar: {
    title: "Naglar",
    subtitle: "Gelé & akryl · ca 2 tim",
    maxPerDay: 4,
  },
  fransar: {
    title: "Fransar",
    subtitle: "Singel, mix & volym · ca 2 tim",
    maxPerDay: 4,
  },
};

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} tim` : `${h} tim ${m} min`;
}

export function getService(id: string) {
  return services.find((s) => s.id === id);
}
