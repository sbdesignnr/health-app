import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RestaurantsScreen } from "@/components/restaurants/restaurants-screen";

export default function RestauraciePage() {
  return (
    <div className="space-y-5 pt-3">
      <div>
        <Link
          href="/profil"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition active:opacity-70"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Profil
        </Link>
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-white">Reštaurácie v Nitre</h1>
      </div>
      <RestaurantsScreen />
    </div>
  );
}
