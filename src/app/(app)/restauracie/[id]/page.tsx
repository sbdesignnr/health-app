import Link from "next/link";
import { RestaurantDetail } from "@/components/restaurants/restaurant-detail";

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-5 pt-3">
      <header className="space-y-1">
        <Link href="/restauracie" className="text-sm text-muted">
          ← Reštaurácie
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Menu</h1>
      </header>
      <RestaurantDetail restaurantId={id} />
    </div>
  );
}
