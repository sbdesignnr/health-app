import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GymSplitScreen } from "@/components/training/gym-split-screen";

export default function GymRozvrhPage() {
  return (
    <div className="space-y-5 pt-3">
      <div>
        <Link
          href="/fitness"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition active:opacity-70"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Fitness
        </Link>
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-white">Rozvrh gymu</h1>
        <p className="mt-1.5 text-sm text-muted">Presné dni a zameranie – AI ich dodrží do bodky</p>
      </div>
      <GymSplitScreen />
    </div>
  );
}
