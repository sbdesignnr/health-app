"use client";

type Weather = { tempC: number; feelsLikeC: number; weatherCode: number };

function icon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 10) return "Dobré ráno";
  if (h < 18) return "Dobrý deň";
  return "Dobrý večer";
}

function dateLabel(): string {
  const s = new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(),
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function GreetingHeader({ name, weather }: { name: string | null; weather: Weather | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="label-caps">{dateLabel()}</p>
        <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-fg">
          {greeting()}
          {name ? `, ${name}` : ""}
        </h1>
      </div>
      {weather && (
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5">
          <span className="text-base leading-none">{icon(weather.weatherCode)}</span>
          <span className="text-sm font-semibold tabular-nums text-white">
            {Math.round(weather.tempC)}°
          </span>
        </div>
      )}
    </div>
  );
}
