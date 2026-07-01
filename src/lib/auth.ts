import { createClient } from "@/lib/supabase/server";

// Vráti id prihláseného používateľa (alebo null). Použiť v server actions / routách.
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
