import { createClient } from "@/lib/supabase/server";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { PushSettings } from "@/components/push/push-settings";
import { signOut } from "./actions";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-5 pt-3">
      <header className="space-y-1">
        <p className="text-sm text-muted">Profil</p>
        <h1 className="text-2xl font-semibold tracking-tight">Nastavenia</h1>
      </header>

      <div className="rounded-card border border-border bg-surface p-4">
        <p className="text-xs text-muted">Prihlásený ako</p>
        <p className="mt-1 font-medium">{user?.email}</p>
      </div>

      <ProfileScreen />

      <PushSettings />

      <form action={signOut}>
        <button
          type="submit"
          className="w-full rounded-2xl border border-border bg-surface-2 py-3 text-sm font-medium text-fg transition active:scale-[0.99]"
        >
          Odhlásiť sa
        </button>
      </form>
    </div>
  );
}
