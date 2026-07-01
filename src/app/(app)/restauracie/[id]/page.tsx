import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RestaurantDetail } from "@/components/restaurants/restaurant-detail";

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-5 pt-3">
      <div>
        <Link
          href="/restauracie"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition active:opacity-70"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Reštaurácie
        </Link>
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-white">Menu</h1>
      </div>
      <RestaurantDetail restaurantId={id} />
    </div>
  );
}
