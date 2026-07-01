import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FoodLogScreen } from "@/components/food-log/food-log-screen";

export default async function DnesPage() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    : null;
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;

  return <FoodLogScreen name={firstName} />;
}
