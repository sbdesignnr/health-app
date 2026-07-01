import { signIn } from "./actions";

const inp =
  "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-fg outline-none transition placeholder:text-muted/70 focus:border-accent";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <div className="mb-10">
        <div className="relative mb-6 inline-grid h-14 w-14 place-items-center rounded-[18px] bg-gradient-to-b from-[#bcff66] to-[#9bff22] text-2xl font-bold text-accent-fg shadow-[0_0_32px_rgba(168,255,62,0.35)]">
          H
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Health Assistant</h1>
        <p className="mt-1.5 text-muted">Prihlás sa do svojho asistenta.</p>
      </div>

      <form action={signIn} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="email" className="label-caps">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inp} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="label-caps">
            Heslo
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={inp}
          />
        </div>

        {error && (
          <p className="rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error ring-1 ring-inset ring-error/20">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="mt-2 w-full rounded-card bg-accent py-3.5 font-semibold text-accent-fg shadow-[0_0_24px_rgba(168,255,62,0.18)] transition active:scale-[0.99]"
        >
          Prihlásiť sa
        </button>
      </form>
    </div>
  );
}
