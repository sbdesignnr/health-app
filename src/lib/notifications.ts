import { getHydration } from "./hydration";
import { getWeather } from "./weather";
import { getDayEvents } from "./schedule";
import type { PushPayload } from "./push";

const WATER_HOURS = [8, 10, 12, 14, 16, 18, 20];

function trainingLabel(type: string): string {
  if (type === "FOOTBALL_TRAINING") return "futbal tréning";
  if (type === "MATCH") return "zápas";
  if (type === "GYM") return "posilňovňu";
  return "tréning";
}

// Notifikácie, ktoré majú byť odoslané v danú lokálnu hodinu.
export async function buildDueNotifications(
  userId: string,
  hour: number,
  dateStr: string,
): Promise<PushPayload[]> {
  const out: PushPayload[] = [];

  // 1) Pitný režim – rozvrhnutý podľa denného množstva.
  if (WATER_HOURS.includes(hour)) {
    const hyd = await getHydration(userId, dateStr);
    const perSlot = Math.round(hyd.targetMl / WATER_HOURS.length / 50) * 50;
    out.push({
      title: "Čas na vodu 💧",
      body: `Pi ~${perSlot} ml. Dnešný cieľ: ${(hyd.targetMl / 1000).toFixed(1)} L.`,
      url: "/dnes",
      tag: "water",
    });
  }

  // 2) Extrémne počasie – raz ráno (8:00).
  if (hour === 8) {
    const weather = await getWeather();
    if (weather && weather.daily.maxTempC >= 30) {
      out.push({
        title: "Dnes bude horúco ☀️",
        body: `Až ${Math.round(weather.daily.maxTempC)} °C. Navýš pitný režim a vyhni sa UV cez poludnie.`,
        url: "/dnes",
        tag: "weather",
      });
    } else if (weather && weather.daily.minTempC <= -5) {
      out.push({
        title: "Dnes bude mráz 🥶",
        body: `Až ${Math.round(weather.daily.minTempC)} °C. Obleč sa teplo a nezabudni piť aj v zime.`,
        url: "/dnes",
        tag: "weather",
      });
    }
  }

  // 3) Timing jedla okolo tréningu – hodinu pred začiatkom.
  const events = await getDayEvents(userId, dateStr);
  for (const e of events) {
    if (e.type === "REST" || e.type === "CUSTOM" || !e.startTime) continue;
    const startH = parseInt(e.startTime.slice(0, 2), 10);
    if (startH === hour + 1) {
      out.push({
        title: "Onedlho tréning 🏃",
        body: `O hodinu máš ${e.title || trainingLabel(e.type)}. Daj si desiatu s ~40–60 g sacharidov.`,
        url: "/dnes",
        tag: "premeal",
      });
    }
  }

  return out;
}
