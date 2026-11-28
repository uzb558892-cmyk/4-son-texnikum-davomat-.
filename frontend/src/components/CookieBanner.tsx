import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applyConsentMode, getSavedConsent } from '../utils/consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    const saved = getSavedConsent();
    if (!saved) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    applyConsentMode({
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    });
    setVisible(false);
  };

  const rejectNonEssential = () => {
    applyConsentMode({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    setVisible(false);
  };

  const saveCustom = () => {
    applyConsentMode({
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: ads ? 'granted' : 'denied',
      ad_user_data: ads ? 'granted' : 'denied',
      ad_personalization: ads ? 'granted' : 'denied'
    });
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie rozilik sozlamalari"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Cookie va maxfiylik sozlamalari</p>
          <p className="leading-relaxed text-slate-600">
            Tizim barqaror ishlashi hamda tashrif statistikasini tahlil qilish uchun cookie’lardan foydalanamiz.{' '}
            <Link to="/maxfiylik-siyosati" className="font-medium text-blue-950 underline">
              Maxfiylik siyosati
            </Link>{' '}
            va{' '}
            <Link to="/foydalanish-shartlari" className="font-medium text-blue-950 underline">
              Foydalanish shartlari
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCustomize((v) => !v)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Sozlash
          </button>
          <button
            type="button"
            onClick={rejectNonEssential}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Rad etish
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-xl bg-blue-950 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-900"
          >
            Roziman
          </button>
        </div>
      </div>

      {customize && (
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-700">
          <label className="flex items-center justify-between py-1">
            <span>Zaruriy sessiya va autentifikatsiya (doim faol)</span>
            <input type="checkbox" checked disabled className="h-4 w-4" />
          </label>
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span>Analitika (GA4 / tashriflar statistikasi)</span>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span>Reklama va shaxsiylashtirish signallari</span>
            <input
              type="checkbox"
              checked={ads}
              onChange={(e) => setAds(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={saveCustom}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Tanlovni saqlash
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
