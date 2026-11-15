"use client";

import { Calendar, Clock } from "lucide-react";

/**
 * Natívne <input type="date"/"time"> si formát zobrazenia berie z REGIÓNU zariadenia,
 * nie z jazyka stránky – na iPhone nastavenom na US sa dátum narodenia ukazoval ako
 * „9/29/03" a čas ako „7:00 AM". Nedá sa to prepísať CSS-kom ani atribútom lang.
 *
 * Riešenie: hodnotu vykreslíme sami v slovenskom formáte a natívny input necháme
 * priehľadne ležať cez celé pole – ťuknutie teda stále otvorí systémový výber
 * (koliesko na iOS), len to, čo je vidieť, je už „29. 9. 2003" a „07:00".
 *
 * Hodnota ostáva v ISO tvare (YYYY-MM-DD / HH:MM), takže zvyšok appky sa nemení.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function formatDateSk(iso: string): string {
  if (!DATE_RE.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  // Intl so skutočným dátumom by mohol podliezť časovú zónu – skladáme priamo.
  return `${d}. ${m}. ${y}`;
}

function Overlay({
  type,
  value,
  onChange,
  min,
  max,
}: {
  type: "date" | "time";
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const v = e.target.value;
        // WebKit vracia pri rozpísanej hodnote občas nezmysel – pustíme ďalej len platné.
        const ok = v === "" || (type === "date" ? DATE_RE.test(v) : TIME_RE.test(v));
        if (ok) onChange(v);
      }}
      aria-label={type === "date" ? "Vybrať dátum" : "Vybrať čas"}
      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
    />
  );
}

export function DateField({
  value,
  onChange,
  className,
  placeholder = "Vyber dátum",
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  className: string;
  placeholder?: string;
  min?: string;
  max?: string;
}) {
  const shown = formatDateSk(value);
  return (
    <div className="relative">
      <div className={`${className} flex items-center justify-between gap-2`}>
        <span className={`min-w-0 truncate tabular-nums ${shown ? "text-fg" : "text-muted/70"}`}>
          {shown || placeholder}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
      </div>
      <Overlay type="date" value={value} onChange={onChange} min={min} max={max} />
    </div>
  );
}

export function TimeField({
  value,
  onChange,
  className,
  placeholder = "--:--",
}: {
  value: string;
  onChange: (v: string) => void;
  className: string;
  placeholder?: string;
}) {
  const shown = TIME_RE.test(value) ? value : "";
  return (
    <div className="relative">
      <div className={`${className} flex items-center justify-between gap-2`}>
        <span className={`min-w-0 truncate tabular-nums ${shown ? "text-fg" : "text-muted/70"}`}>
          {shown || placeholder}
        </span>
        <Clock className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
      </div>
      <Overlay type="time" value={value} onChange={onChange} />
    </div>
  );
}
