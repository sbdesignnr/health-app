"use client";

import { useEffect, useState } from "react";
import { Droplets } from "lucide-react";

type Weather = {
  current: {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    precipitationMm: number;
    uvIndex: number;
    weatherCode: number;
    windKmh: number;
  };
  daily: { maxTempC: number; minTempC: number; uvMax: number; precipSum: number };
};

type Hydration = {
  targetMl: number;
  baseMl: number;
  heatMl: number;
  trainingMl: number;
  maxTempC: number | null;
};

function describe(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Jasno", icon: "☀️" };
  if (code <= 2) return { label: "Polojasno", icon: "🌤️" };
  if (code === 3) return { label: "Oblačno", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Hmla", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Mrholenie", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "Dážď", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Sneženie", icon: "🌨️" };
  if (code >= 80 && code <= 82) return { label: "Prehánky", icon: "🌦️" };
  if (code >= 95) return { label: "Búrka", icon: "⛈️" };
  return { label: "Počasie", icon: "🌡️" };
}

export function WeatherCard() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [hydration, setHydration] = useState<Hydration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const p = (n: number) => String(n).padStart(2, "0");
        const date = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
        const res = await fetch(`/api/weather?date=${date}`);
        if (res.ok) {
          const d = await res.json();
          setWeather(d.weather);
          setHydration(d.hydration);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="h-24 animate-pulse rounded-card border border-border bg-surface" />;
  }
  if (!weather && !hydration) return null;

  const w = weather?.current;
  const desc = w ? describe(w.weatherCode) : null;
  const liters = hydration ? (hydration.targetMl / 1000).toFixed(1) : null;

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      {w && desc && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{desc.icon}</span>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{Math.round(w.tempC)} °C</p>
              <p className="text-xs text-muted">
                {desc.label} · pocitovo {Math.round(w.feelsLikeC)} °C · Nitra
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-muted">
            <p>UV {Math.round(w.uvIndex)}</p>
            <p>max {Math.round(weather!.daily.maxTempC)} °C</p>
          </div>
        </div>
      )}

      {hydration && (
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fat/15 text-fat">
            <Droplets className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium">
              Pitný režim: <span className="tabular-nums">{liters} L</span>
            </p>
            <p className="text-xs text-muted">
              bazál {Math.round(hydration.baseMl / 100) / 10} L
              {hydration.heatMl > 0 && ` · teplo +${Math.round(hydration.heatMl / 100) / 10} L`}
              {hydration.trainingMl > 0 && ` · tréning +${Math.round(hydration.trainingMl / 100) / 10} L`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
