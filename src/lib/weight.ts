import { prisma } from "./prisma";

export async function addWeight(userId: string, weightKg: number, measuredAt?: string) {
  const when = measuredAt ? new Date(measuredAt) : new Date();
  const log = await prisma.weightLog.create({
    data: { userId, weightKg, measuredAt: when },
  });

  // Aktualizuj denormalizovanú currentWeightKg, ak je toto najnovší záznam.
  const latest = await prisma.weightLog.findFirst({
    where: { userId },
    orderBy: { measuredAt: "desc" },
  });
  if (latest && latest.id === log.id) {
    await prisma.user.update({ where: { id: userId }, data: { currentWeightKg: weightKg } });
  }
  return log;
}

export async function getWeightSeries(userId: string, days = 180) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const logs = await prisma.weightLog.findMany({
    where: { userId, measuredAt: { gte: since } },
    orderBy: { measuredAt: "asc" },
  });
  return logs.map((l) => ({
    id: l.id,
    weightKg: l.weightKg,
    measuredAt: l.measuredAt.toISOString(),
  }));
}

export async function getWeightStats(userId: string) {
  const all = await prisma.weightLog.findMany({
    where: { userId },
    orderBy: { measuredAt: "desc" },
    take: 90,
  });
  const current = all[0]?.weightKg ?? null;

  function changeSince(days: number): number | null {
    if (current == null || all.length < 2) return null;
    const target = new Date();
    target.setDate(target.getDate() - days);
    const past = all.find((l) => l.measuredAt <= target) ?? all[all.length - 1];
    if (!past) return null;
    return Math.round((current - past.weightKg) * 10) / 10;
  }

  return {
    current,
    change7d: changeSince(7),
    change30d: changeSince(30),
    count: all.length,
  };
}
