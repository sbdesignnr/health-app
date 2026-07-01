import { getHydration } from "./hydration";
import { getWeather } from "./weather";
import { getDayEvents } from "./schedule";
import { prisma } from "./prisma";
import { getPlan } from "./meal-plans";
import type { PushPayload } from "./push";

const WATER_HOURS = [8, 10, 12, 14, 16, 18, 20];

const MEAL_LABEL_AKUZ: Record<string, string> = {
  BREAKFAST: "raňajky",
  MORNING_SNACK: "desiatu",
  LUNCH: "obed",
  AFTERNOON_SNACK: "olovrant",
  DINNER: "večeru",
};

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

  // 4) Kofeín stop – ~8 h pred spánkom (polčas kofeínu ~5–6 h → chráni spánok a regeneráciu).
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { sleepTime: true } });
  if (user?.sleepTime) {
    const sleepH = parseInt(user.sleepTime.slice(0, 2), 10);
    if (Number.isFinite(sleepH)) {
      let cutoff = sleepH - 8;
      if (cutoff < 0) cutoff += 24;
      if (hour === cutoff) {
        out.push({
          title: "Posledná káva ☕️",
          body: `Do spánku (${user.sleepTime}) ostáva ~8 h. Kofeín má polčas ~5–6 h – odteraz radšej stop, aby ti nenarušil spánok a regeneráciu. Daj si vodu alebo bylinkový čaj.`,
          url: "/dnes",
          tag: "caffeine",
        });
      }
    }
  }

  // 5) Časy jedál z AI jedálnička – pripomeň jesť v naplánovanom čase.
  const plan = await getPlan(userId, dateStr);
  if (plan) {
    for (const it of plan.items) {
      if (!it.timeOfDay) continue;
      const mealH = parseInt(it.timeOfDay.slice(0, 2), 10);
      if (Number.isFinite(mealH) && mealH === hour) {
        out.push({
          title: `Čas na ${MEAL_LABEL_AKUZ[it.mealType] ?? "jedlo"} 🍽️`,
          body: `${it.name} – ~${Math.round(it.caloriesKcal)} kcal (naplánované o ${it.timeOfDay}).`,
          url: "/jedalnicek",
          tag: "meal",
        });
      }
    }
  }

  // 6) Pripomienka obnoviť tréningový plán – raz denne o 9:00, keď prešla platnosť.
  if (hour === 9) {
    const programs = await prisma.trainingProgram.findMany({
      where: { userId, active: true, reviewAfterDays: { not: null } },
      select: { kind: true, reviewAfterDays: true, createdAt: true, startDate: true },
    });
    const overdue = programs.filter((p) => {
      const start = (p.startDate ?? p.createdAt).getTime();
      return Date.now() >= start + (p.reviewAfterDays ?? 0) * 86400000;
    });
    if (overdue.length > 0) {
      const kinds = overdue.map((p) => (p.kind === "GYM" ? "gym" : "futbalový")).join(" aj ");
      out.push({
        title: "Čas obnoviť tréningový plán 🔄",
        body: `Tvoj ${kinds} plán prešiel svojou fázou. Otvor Fitness/Futbal a daj Regenerovať – AI ho prispôsobí aktuálnej fáze a tvojmu stavu.`,
        url: overdue[0].kind === "GYM" ? "/fitness" : "/futbal",
        tag: "plan-refresh",
      });
    }
  }

  return out;
}
