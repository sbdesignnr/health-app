import { WeightScreen } from "@/components/progress/weight-screen";
import { InsightsSection } from "@/components/insights/insights-section";

export default function ProgresPage() {
  return (
    <div className="space-y-6 pt-3">
      <div>
        <p className="label-caps">Progres</p>
        <h1 className="mt-1 text-[28px] font-bold leading-none tracking-tight text-white">Tvoj vývoj</h1>
      </div>
      <WeightScreen />
      <InsightsSection />
    </div>
  );
}
