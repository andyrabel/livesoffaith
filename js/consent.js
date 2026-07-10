/* ============================================================
   Lives of Faith — Cookie Consent Gate
   Blocks Google Analytics until consent is granted for visitors
   in regions where prior consent is legally required (EU/EEA/UK).
   Elsewhere, analytics loads directly — no banner shown.

   Region detection is a best-effort heuristic based on the
   browser's IANA timezone (no network call, no IP lookup — that
   would itself be a privacy problem). It can be fooled by VPNs
   or travel; when detection fails entirely, it defaults to
   showing the banner (fail safe, not fail open).
   ============================================================ */
(function () {
  var CONSENT_KEY = 'laf_consent';
  var GA_ID = 'G-X7V501G4W2';

  // Timezones outside the "Europe/" prefix that still belong to
  // EU/EEA/UK territories (Atlantic island groups).
  var REGULATED_TZ_EXTRA = [
    'Atlantic/Reykjavik', 'Atlantic/Canary', 'Atlantic/Madeira',
    'Atlantic/Azores', 'Atlantic/Faroe'
  ];

  // Testing aid only: ?laf_region=eu or ?laf_region=other on the URL
  // forces the region check either way, so the banner can be exercised
  // from a non-EU/UK timezone without changing system settings. Has no
  // effect for real visitors, who never pass this param.
  function regionOverride() {
    try {
      var params = new URLSearchParams(window.location.search);
      var v = params.get('laf_region');
      if (v === 'eu') return true;
      if (v === 'other') return false;
    } catch (e) {}
    return null;
  }

  function isRegulatedRegion() {
    var override = regionOverride();
    if (override !== null) return override;
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.indexOf('Europe/') === 0) return true;
      return REGULATED_TZ_EXTRA.indexOf(tz) !== -1;
    } catch (e) {
      return true;
    }
  }

  function loadAnalytics(extraConfig) {
    if (window.__lafAnalyticsLoaded) return;
    window.__lafAnalyticsLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID, extraConfig || {});
  }

  function getConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function setConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  function showBanner() {
    if (document.getElementById('laf-consent-banner')) return;
    var extraConfig = window.LAF_GA_CONFIG || {};

    var banner = document.createElement('div');
    banner.id = 'laf-consent-banner';
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<p>We use Google Analytics to see which pages help worship leaders and ' +
      'families most. This sets an analytics cookie in your browser. See our ' +
      '<a href="about.html#cookies">cookie policy</a>.</p>' +
      '<div class="consent-banner-actions">' +
      '<button type="button" class="btn btn-secondary consent-decline">Decline</button>' +
      '<button type="button" class="btn btn-primary consent-accept">Accept</button>' +
      '</div>';
    document.body.appendChild(banner);

    banner.querySelector('.consent-accept').addEventListener('click', function () {
      setConsent('granted');
      loadAnalytics(extraConfig);
      banner.remove();
    });
    banner.querySelector('.consent-decline').addEventListener('click', function () {
      setConsent('denied');
      banner.remove();
    });
  }

  function init() {
    var extraConfig = window.LAF_GA_CONFIG || {};
    var consent = getConsent();

    if (consent === 'granted') {
      loadAnalytics(extraConfig);
      return;
    }
    if (consent === 'denied') {
      return;
    }
    if (isRegulatedRegion()) {
      showBanner();
    } else {
      loadAnalytics(extraConfig);
    }
  }

  // Lets an "About" page link reopen the banner so a visitor can
  // change their mind after the initial choice.
  window.__lafOpenConsentPreferences = function () {
    showBanner();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
