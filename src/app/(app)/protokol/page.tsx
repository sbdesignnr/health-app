import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProtocolScreen } from "@/components/protocol/protocol-screen";

export default function ProtokolPage() {
  return (
    <div className="space-y-5 pt-3">
      <div>
        <Link
          href="/jedalnicek"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted transition active:opacity-70"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Jedálniček
        </Link>
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-white">Výživový protokol</h1>
        <p className="mt-1.5 text-sm text-muted">
          Jedálničky prispôsobené tvojmu aktuálnemu stavu — s dobou dodržiavania
        </p>
      </div>
      <ProtocolScreen />
    </div>
  );
}
