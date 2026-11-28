export type ConsentState = {
  analytics_storage: 'granted' | 'denied';
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
  decidedAt: string;
};

const STORAGE_KEY = 'texnikum4_consent_v2';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function getSavedConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

export function applyConsentMode(state: Omit<ConsentState, 'decidedAt'>) {
  const full: ConsentState = {
    ...state,
    decidedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // ignore storage errors
  }

  window.dataLayer = window.dataLayer || [];
  const gtag =
    window.gtag ||
    function (...args: unknown[]) {
      window.dataLayer.push(args);
    };
  window.gtag = gtag;

  gtag('consent', 'update', {
    analytics_storage: full.analytics_storage,
    ad_storage: full.ad_storage,
    ad_user_data: full.ad_user_data,
    ad_personalization: full.ad_personalization
  });

  window.dataLayer.push({
    event: 'consent_update',
    analytics_storage: full.analytics_storage,
    ad_storage: full.ad_storage
  });
}

export function initAnalyticsAndConsent() {
  window.dataLayer = window.dataLayer || [];
  const gtag =
    window.gtag ||
    function (...args: unknown[]) {
      window.dataLayer.push(args);
    };
  window.gtag = gtag;

  const saved = getSavedConsent();
  gtag('consent', 'default', {
    analytics_storage: saved?.analytics_storage ?? 'denied',
    ad_storage: saved?.ad_storage ?? 'denied',
    ad_user_data: saved?.ad_user_data ?? 'denied',
    ad_personalization: saved?.ad_personalization ?? 'denied',
    wait_for_update: 500
  });

  const gtmId = import.meta.env.VITE_GTM_ID?.trim();
  const ga4Id = import.meta.env.VITE_GA4_ID?.trim();

  if (gtmId && !document.getElementById('gtm-script')) {
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });
    const script = document.createElement('script');
    script.id = 'gtm-script';
    script.async = true;
    script.defer = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    document.head.appendChild(script);
  }

  if (ga4Id && !document.getElementById('ga4-script')) {
    const gaScript = document.createElement('script');
    gaScript.id = 'ga4-script';
    gaScript.async = true;
    gaScript.defer = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    document.head.appendChild(gaScript);

    gtag('js', new Date());
    gtag('config', ga4Id, {
      anonymize_ip: true
    });
  }
}
