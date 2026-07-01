import Link from "next/link";
import { RestaurantsScreen } from "@/components/restaurants/restaurants-screen";

export default function RestauraciePage() {
  return (
    <div className="space-y-5 pt-3">
      <header className="space-y-1">
        <Link href="/profil" className="text-sm text-muted">
          ← Profil
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Reštaurácie v Nitre</h1>
      </header>
      <RestaurantsScreen />
    </div>
  );
}
