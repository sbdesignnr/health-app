import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { PushSettings } from "@/components/push/push-settings";
import { WorkoutSync } from "@/components/workout/workout-sync";
import { signOut } from "./actions";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "?";

  return (
    <div className="space-y-5 pt-3">
      <div>
        <p className="label-caps">Profil</p>
        <h1 className="mt-1 text-[28px] font-bold leading-none tracking-tight text-white">Nastavenia</h1>
      </div>

      <div className="card flex items-center gap-3.5 p-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent/15 text-lg font-bold text-accent ring-1 ring-inset ring-accent/20">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="label-caps">Prihlásený ako</p>
          <p className="mt-0.5 truncate font-medium text-fg">{email}</p>
        </div>
      </div>

      <ProfileScreen />

      <WorkoutSync />

      <PushSettings />

      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-card border border-border bg-surface-2 py-3.5 text-sm font-medium text-muted transition active:scale-[0.99]"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          Odhlásiť sa
        </button>
      </form>
    </div>
  );
}
