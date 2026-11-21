export default function Splash() {
  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <img
        src="/logo.png"
        alt="4-son texnikum davomat logotipi"
        className="h-24 w-24 animate-pulse rounded-2xl object-cover shadow-xl ring-2 ring-amber-300/40"
      />
      <div className="mt-4 text-sm font-bold tracking-wide text-white">4-SON TEXNIKUM</div>
      <div className="mt-1 text-xs text-indigo-300">Yuklanmoqda...</div>
    </div>
  );
}
