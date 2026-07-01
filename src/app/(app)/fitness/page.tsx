import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FitnessScreen } from "@/components/training/fitness-screen";

export default function FitnessPage() {
  return (
    <div className="space-y-5 pt-3">
      <div>
        <Link
          href="/profil"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition active:opacity-70"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Profil
        </Link>
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-white">Fitness</h1>
      </div>
      <FitnessScreen />
    </div>
  );
}
