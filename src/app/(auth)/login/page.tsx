import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <div className="mb-10 space-y-2">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-accent-fg">
          H
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Health Assistant</h1>
        <p className="text-muted">Prihlás sa do svojho asistenta.</p>
      </div>

      <form action={signIn} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-accent"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm text-muted">
            Heslo
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-protein">{error}</p>}

        <button
          type="submit"
          className="mt-2 w-full rounded-2xl bg-accent py-3 font-semibold text-accent-fg transition active:scale-[0.99]"
        >
          Prihlásiť sa
        </button>
      </form>
    </div>
  );
}
