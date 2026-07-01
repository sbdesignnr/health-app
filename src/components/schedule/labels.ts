export type EventType = "FOOTBALL_TRAINING" | "GYM" | "MATCH" | "REST" | "CUSTOM";
export type Intensity = "LOW" | "MEDIUM" | "HIGH";

export type SEvent = {
  id: string;
  type: EventType;
  title: string | null;
  gymFocus: string | null;
  intensity: Intensity;
  isRecurring: boolean;
  dayOfWeek: number | null;
  date: string | null;
  startTime: string | null;
  durationMin: number | null;
  estimatedKcal: number | null;
};

export const TYPE_LABEL: Record<EventType, string> = {
  FOOTBALL_TRAINING: "Futbal tréning",
  GYM: "Posilňovňa",
  MATCH: "Zápas",
  REST: "Voľno",
  CUSTOM: "Iné",
};

export const TYPE_OPTS: EventType[] = ["FOOTBALL_TRAINING", "GYM", "MATCH", "REST", "CUSTOM"];

export const INTENSITY_LABEL: Record<Intensity, string> = {
  LOW: "Nízka",
  MEDIUM: "Stredná",
  HIGH: "Vysoká",
};

export const INTENSITY_OPTS: Intensity[] = ["LOW", "MEDIUM", "HIGH"];

// 0=Ne … 6=So (JS konvencia), zobrazené od pondelka.
export const DAYS: { value: number; short: string; label: string }[] = [
  { value: 1, short: "Po", label: "Pondelok" },
  { value: 2, short: "Ut", label: "Utorok" },
  { value: 3, short: "St", label: "Streda" },
  { value: 4, short: "Št", label: "Štvrtok" },
  { value: 5, short: "Pi", label: "Piatok" },
  { value: 6, short: "So", label: "Sobota" },
  { value: 0, short: "Ne", label: "Nedeľa" },
];

export const GYM_FOCUS_OPTS = ["Nohy", "Hruď", "Chrbát", "Ramená", "Ruky", "Full-body"];

export function isRestLike(type: EventType): boolean {
  return type === "REST" || type === "CUSTOM";
}

export function formatShortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(d)}.${Number(m)}.`;
}
