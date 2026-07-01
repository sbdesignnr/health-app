import Link from "next/link";
import { ScheduleScreen } from "@/components/schedule/schedule-screen";

export default function RozvrhPage() {
  return (
    <div className="space-y-5 pt-3">
      <header className="space-y-1">
        <Link href="/profil" className="text-sm text-muted">
          ← Profil
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Rozvrh tréningov</h1>
      </header>
      <ScheduleScreen />
    </div>
  );
}
