// Open-Meteo (zadarmo, bez API kľúča) – počasie pre Nitru.
export const NITRA = { latitude: 48.3069, longitude: 18.0866, name: "Nitra" };

export type Weather = {
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

export async function getWeather(
  lat = NITRA.latitude,
  lon = NITRA.longitude,
): Promise<Weather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,uv_index,wind_speed_10m` +
    `&daily=uv_index_max,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=Europe%2FBratislava&forecast_days=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 900 } });
    if (!res.ok) return null;
    const d = await res.json();
    const c = d.current;
    const dl = d.daily;
    return {
      current: {
        tempC: c.temperature_2m,
        feelsLikeC: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        precipitationMm: c.precipitation,
        uvIndex: c.uv_index,
        weatherCode: c.weather_code,
        windKmh: c.wind_speed_10m,
      },
      daily: {
        maxTempC: dl.temperature_2m_max[0],
        minTempC: dl.temperature_2m_min[0],
        uvMax: dl.uv_index_max[0],
        precipSum: dl.precipitation_sum[0],
      },
    };
  } catch {
    return null;
  }
}

// WMO weather code → SK popis + emoji.
export function weatherDescription(code: number): { label: string; icon: string } {
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
