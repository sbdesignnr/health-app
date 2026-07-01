import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { createRestaurant, listRestaurants } from "@/lib/restaurants";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ restaurants: await listRestaurants(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Názov je povinný." }, { status: 400 });
  const address = typeof b?.address === "string" && b.address.trim() ? b.address.trim() : null;

  const r = await createRestaurant(userId, name, address);
  return NextResponse.json({ restaurant: { id: r.id, name: r.name, address: r.address } });
}
