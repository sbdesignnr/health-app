import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ShoppingScreen } from "@/components/shopping/shopping-screen";

export default function NakupPage() {
  return (
    <div className="space-y-5 pt-3">
      <div>
        <Link
          href="/jedalnicek"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition active:opacity-70"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Jedálniček
        </Link>
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-white">Nákupný zoznam</h1>
        <p className="mt-1.5 text-sm text-muted">
          Z jedálničkov na 7 dní · rozdelené podľa obchodov · konkrétne produkty
        </p>
      </div>
      <ShoppingScreen />
    </div>
  );
}
