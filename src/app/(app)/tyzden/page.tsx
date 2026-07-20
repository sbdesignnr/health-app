import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { WeeklyPlanScreen } from "@/components/week/weekly-plan-screen";

export default function TyzdenPage() {
  return (
    <div className="space-y-5 pt-3">
      <div>
        <Link
          href="/dnes"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition active:opacity-70"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Dnes
        </Link>
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-white">Týždenný plán</h1>
      </div>
      <WeeklyPlanScreen />
    </div>
  );
}
