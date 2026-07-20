import { prisma } from "./prisma";
import { generateShoppingList, type ShopGroup } from "./shopping-ai";
import { bratislavaDate } from "./workout";

export type ShoppingListDTO = {
  id: string;
  fromDate: string;
  toDate: string;
  groups: ShopGroup[];
  totalEur: number;
  note: string | null;
  budgetNote: string | null;
  createdAt: string;
};

function toDTO(l: {
  id: string;
  fromDate: Date;
  toDate: Date;
  groups: unknown;
  totalEur: number;
  note: string | null;
  budgetNote: string | null;
  createdAt: Date;
}): ShoppingListDTO {
  return {
    id: l.id,
    fromDate: l.fromDate.toISOString().slice(0, 10),
    toDate: l.toDate.toISOString().slice(0, 10),
    groups: (l.groups as ShopGroup[]) ?? [],
    totalEur: l.totalEur,
    note: l.note,
    budgetNote: l.budgetNote,
    createdAt: l.createdAt.toISOString(),
  };
}

/** Najnovší nákupný zoznam používateľa. */
export async function getLatestList(userId: string): Promise<ShoppingListDTO | null> {
  const l = await prisma.shoppingList.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  return l ? toDTO(l) : null;
}

/** Vygeneruje nový zoznam na `days` dní od `from` (default: dnes, 7 dní). */
export async function createList(
  userId: string,
  fromStr?: string,
  days = 7,
): Promise<ShoppingListDTO> {
  const from = fromStr || bratislavaDate();
  const toDate = new Date(`${from}T00:00:00Z`);
  toDate.setUTCDate(toDate.getUTCDate() + Math.max(1, Math.min(14, days)) - 1);
  const to = toDate.toISOString().slice(0, 10);

  const result = await generateShoppingList(userId, from, to);

  const created = await prisma.shoppingList.create({
    data: {
      userId,
      fromDate: new Date(`${from}T00:00:00Z`),
      toDate: new Date(`${to}T00:00:00Z`),
      model: result.model,
      groups: result.groups,
      totalEur: result.totalEur,
      note: result.note,
      budgetNote: result.budgetNote,
    },
  });
  return toDTO(created);
}

/** Odškrtnutie položky (uloží sa do groups). */
export async function toggleItem(
  userId: string,
  listId: string,
  groupIndex: number,
  itemIndex: number,
  checked: boolean,
): Promise<ShoppingListDTO | null> {
  const list = await prisma.shoppingList.findFirst({ where: { id: listId, userId } });
  if (!list) return null;

  const groups = (list.groups as ShopGroup[]) ?? [];
  const group = groups[groupIndex];
  if (!group?.items?.[itemIndex]) return toDTO(list);
  group.items[itemIndex].checked = checked;

  const updated = await prisma.shoppingList.update({
    where: { id: list.id },
    data: { groups },
  });
  return toDTO(updated);
}
