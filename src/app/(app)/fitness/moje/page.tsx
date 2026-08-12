import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SplitsScreen } from "@/components/training/splits-screen";

export default function MojeTreningyPage() {
  return (
    <div className="space-y-5 pt-3">
      <div>
        <Link
          href="/fitness"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition active:opacity-70"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Fitness
        </Link>
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-white">Moje tréningy</h1>
        <p className="mt-1.5 text-sm text-muted">Vlastné splity a cviky · zápis váh a opakovaní</p>
      </div>
      <SplitsScreen />
    </div>
  );
}
