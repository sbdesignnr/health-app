import { prisma } from "./prisma";

export type MenuItemDTO = {
  id: string;
  dayOfWeek: number | null;
  name: string;
  description: string | null;
  priceEur: number | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  macrosSource: string;
};

export type RestaurantDTO = {
  id: string;
  name: string;
  address: string | null;
  items: MenuItemDTO[];
};

export type MenuItemInput = {
  dayOfWeek: number | null;
  name: string;
  description: string | null;
  priceEur: number | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  macrosSource: "AI_ESTIMATED" | "MANUAL";
};

export async function listRestaurants(userId: string) {
  return prisma.restaurant.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, address: true },
  });
}

export async function createRestaurant(userId: string, name: string, address: string | null) {
  return prisma.restaurant.create({ data: { userId, name, address } });
}

export async function updateRestaurant(
  userId: string,
  id: string,
  data: { name?: string; address?: string | null },
) {
  const r = await prisma.restaurant.findFirst({ where: { id, userId } });
  if (!r) throw new Error("Reštaurácia neexistuje.");
  return prisma.restaurant.update({
    where: { id },
    data: {
      name: data.name ?? undefined,
      address: data.address === undefined ? undefined : data.address,
    },
  });
}

export async function deleteRestaurant(userId: string, id: string) {
  await prisma.restaurant.deleteMany({ where: { id, userId } });
}

async function getOrCreateActiveMenu(restaurantId: string) {
  const existing = await prisma.restaurantMenu.findFirst({
    where: { restaurantId },
    orderBy: { validFrom: "desc" },
  });
  if (existing) return existing;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return prisma.restaurantMenu.create({ data: { restaurantId, validFrom: today, validTo: null } });
}

function toMenuItemDTO(i: {
  id: string;
  dayOfWeek: number | null;
  name: string;
  description: string | null;
  priceEur: number | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  macrosSource: string;
}): MenuItemDTO {
  return {
    id: i.id,
    dayOfWeek: i.dayOfWeek,
    name: i.name,
    description: i.description,
    priceEur: i.priceEur,
    caloriesKcal: i.caloriesKcal,
    proteinG: i.proteinG,
    carbsG: i.carbsG,
    fatG: i.fatG,
    macrosSource: i.macrosSource,
  };
}

export async function getRestaurant(userId: string, id: string): Promise<RestaurantDTO | null> {
  const r = await prisma.restaurant.findFirst({
    where: { id, userId },
    include: {
      menus: {
        orderBy: { validFrom: "desc" },
        take: 1,
        include: { items: { orderBy: [{ dayOfWeek: "asc" }, { createdAt: "asc" }] } },
      },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    items: (r.menus[0]?.items ?? []).map(toMenuItemDTO),
  };
}

export async function addMenuItem(userId: string, restaurantId: string, item: MenuItemInput) {
  const r = await prisma.restaurant.findFirst({ where: { id: restaurantId, userId } });
  if (!r) throw new Error("Reštaurácia neexistuje.");
  const menu = await getOrCreateActiveMenu(restaurantId);
  await prisma.menuItem.create({
    data: {
      menuId: menu.id,
      dayOfWeek: item.dayOfWeek,
      name: item.name,
      description: item.description,
      priceEur: item.priceEur,
      caloriesKcal: item.caloriesKcal,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      macrosSource: item.macrosSource,
    },
  });
  return getRestaurant(userId, restaurantId);
}

export async function updateMenuItem(userId: string, itemId: string, data: Partial<MenuItemInput>) {
  const item = await prisma.menuItem.findFirst({
    where: { id: itemId },
    include: { menu: { include: { restaurant: true } } },
  });
  if (!item || item.menu.restaurant.userId !== userId) throw new Error("Položka neexistuje.");
  await prisma.menuItem.update({
    where: { id: itemId },
    data: {
      dayOfWeek: data.dayOfWeek === undefined ? undefined : data.dayOfWeek,
      name: data.name ?? undefined,
      description: data.description === undefined ? undefined : data.description,
      priceEur: data.priceEur === undefined ? undefined : data.priceEur,
      caloriesKcal: data.caloriesKcal === undefined ? undefined : data.caloriesKcal,
      proteinG: data.proteinG === undefined ? undefined : data.proteinG,
      carbsG: data.carbsG === undefined ? undefined : data.carbsG,
      fatG: data.fatG === undefined ? undefined : data.fatG,
      macrosSource: data.macrosSource ?? undefined,
    },
  });
  return getRestaurant(userId, item.menu.restaurant.id);
}

export async function deleteMenuItem(userId: string, restaurantId: string, itemId: string) {
  const item = await prisma.menuItem.findFirst({
    where: { id: itemId },
    include: { menu: { include: { restaurant: true } } },
  });
  if (item && item.menu.restaurant.userId === userId) {
    await prisma.menuItem.delete({ where: { id: itemId } });
  }
  return getRestaurant(userId, restaurantId);
}

export function parseMenuItemInput(raw: unknown): MenuItemInput | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return null;
  const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const dow =
    typeof b.dayOfWeek === "number" && b.dayOfWeek >= 0 && b.dayOfWeek <= 6
      ? Math.round(b.dayOfWeek)
      : null;
  return {
    dayOfWeek: dow,
    name,
    description: typeof b.description === "string" && b.description.trim() ? b.description.trim() : null,
    priceEur: numOrNull(b.priceEur),
    caloriesKcal: numOrNull(b.caloriesKcal),
    proteinG: numOrNull(b.proteinG),
    carbsG: numOrNull(b.carbsG),
    fatG: numOrNull(b.fatG),
    macrosSource: b.macrosSource === "AI_ESTIMATED" ? "AI_ESTIMATED" : "MANUAL",
  };
}

// Nahradí celé menu položkami (napr. z vision prepisu fotky).
export async function replaceMenu(
  userId: string,
  restaurantId: string,
  items: MenuItemInput[],
): Promise<RestaurantDTO | null> {
  const r = await prisma.restaurant.findFirst({ where: { id: restaurantId, userId } });
  if (!r) throw new Error("Reštaurácia neexistuje.");
  const menu = await getOrCreateActiveMenu(restaurantId);
  await prisma.$transaction([
    prisma.menuItem.deleteMany({ where: { menuId: menu.id } }),
    prisma.menuItem.createMany({
      data: items.map((it) => ({
        menuId: menu.id,
        dayOfWeek: it.dayOfWeek,
        name: it.name,
        description: it.description,
        priceEur: it.priceEur,
        caloriesKcal: it.caloriesKcal,
        proteinG: it.proteinG,
        carbsG: it.carbsG,
        fatG: it.fatG,
        macrosSource: it.macrosSource,
      })),
    }),
  ]);
  return getRestaurant(userId, restaurantId);
}
