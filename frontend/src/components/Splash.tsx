export default function Splash() {
  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900">
      <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-white shadow-card">
        <svg className="h-8 w-8 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12l5 5L20 6" />
        </svg>
      </div>
      <div className="mt-4 text-sm font-bold tracking-wide text-white">4-SON TEXNIKUM</div>
      <div className="mt-1 text-xs text-brand-200">Yuklanmoqda...</div>
    </div>
  );
}
