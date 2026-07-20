// Zobrazí sa OKAMŽITE po ťuknutí na tab (kým server pripraví stránku) → appka pôsobí bez odozvy.
export default function Loading() {
  return (
    <div className="space-y-4 pt-3">
      <div className="skeleton h-9 w-2/5 rounded-xl" />
      <div className="skeleton h-28 rounded-card" />
      <div className="skeleton h-20 rounded-card" />
      <div className="skeleton h-20 rounded-card" />
    </div>
  );
}
