import CookieConsent from 'vanilla-cookieconsent';

declare global {
    interface Window {
        dataLayer: IArguments[];
        gtag: (...args: unknown[]) => void;
        [key: `ga-disable-${string}`]: boolean;
    }
}

const measurementId = document.querySelector<HTMLElement>('[data-ga-measurement-id]')?.dataset.gaMeasurementId;

if (measurementId) {
    let loaded = false;

    const syncConsent = () => {
        const accepted = CookieConsent.acceptedCategory('analytics');
        window[`ga-disable-${measurementId}`] = !accepted;

        if (!accepted) {
            if (loaded) window.gtag('consent', 'update', { analytics_storage: 'denied' });
            return;
        }
        if (loaded) return;
        loaded = true;

        window.dataLayer = window.dataLayer || [];
        window.gtag = function (..._args: unknown[]) {
            window.dataLayer.push(arguments);
        };
        window.gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
        });
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
        window.gtag('js', new Date());
        window.gtag('config', measurementId, {
            cookie_expires: 60 * 60 * 24 * 365 * 2,
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
        });

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        document.head.append(script);
    };

    void CookieConsent.run({
        mode: 'opt-in',
        cookie: { name: 'cc_cookie', expiresAfterDays: 180 },
        guiOptions: {
            consentModal: { layout: 'box inline', position: 'bottom left', equalWeightButtons: true },
            preferencesModal: { layout: 'box', equalWeightButtons: true },
        },
        onConsent: syncConsent,
        onChange: syncConsent,
        categories: {
            necessary: { enabled: true, readOnly: true },
            analytics: {
                autoClear: {
                    cookies: [{ name: /^_ga(?:_|$)/ }],
                    // Unload Google's listeners as well as deleting its cookies after revocation.
                    reloadPage: true,
                },
            },
        },
        language: {
            default: 'en',
            translations: {
                en: {
                    consentModal: {
                        title: 'Cookie preferences',
                        description: 'We use a necessary cookie to remember your choice. With your permission, Google Analytics 4 measures visits and how this site is used. You can reject analytics and continue browsing, or change your choice at any time in the footer.',
                        acceptAllBtn: 'Accept analytics',
                        acceptNecessaryBtn: 'Reject analytics',
                        showPreferencesBtn: 'Manage preferences',
                        footer: '<a href="/privacy">Privacy Policy</a><a href="https://www.iubenda.com/privacy-policy/74971648/cookie-policy" target="_blank" rel="noopener noreferrer">Cookie Policy</a>',
                    },
                    preferencesModal: {
                        title: 'Cookie preferences',
                        acceptAllBtn: 'Accept analytics',
                        acceptNecessaryBtn: 'Reject analytics',
                        savePreferencesBtn: 'Save preferences',
                        closeIconLabel: 'Close preferences',
                        sections: [
                            {
                                title: 'Necessary',
                                description: 'The cc_cookie cookie saves your consent choice for 180 days. It is not used for analytics.',
                                linkedCategory: 'necessary',
                                cookieTable: {
                                    caption: 'Necessary cookie',
                                    headers: { name: 'Cookie', provider: 'Provider', duration: 'Duration' },
                                    body: [{ name: 'cc_cookie', provider: 'bonfry.com', duration: '180 days' }],
                                },
                            },
                            {
                                title: 'Measurement — Google Analytics 4',
                                description: 'Google Ireland Limited provides optional analytics to measure traffic and understand how bonfry.com is used. Data includes usage data, user counts, session statistics and cookie identifiers. Analytics only loads after you accept; advertising consent stays denied. Withdrawing consent deletes its cookies and reloads the page to stop analytics.',
                                linkedCategory: 'analytics',
                                cookieTable: {
                                    caption: 'Google Analytics cookies',
                                    headers: { name: 'Cookie', provider: 'Provider', duration: 'Duration' },
                                    body: [
                                        { name: '_ga', provider: 'Google Ireland Limited', duration: '2 years' },
                                        { name: '_ga_*', provider: 'Google Ireland Limited', duration: '2 years' },
                                    ],
                                },
                            },
                            {
                                title: 'Privacy and your rights',
                                description: 'The data controller is Simone Bonfrate. For privacy questions or requests concerning your data, contact <a href="mailto:info@bonfry.com">info@bonfry.com</a>. Read the <a href="/privacy">Privacy Policy</a> for processing details and your rights, and the <a href="https://www.iubenda.com/privacy-policy/74971648/cookie-policy" target="_blank" rel="noopener noreferrer">Cookie Policy</a> for information about cookies and browser controls.',
                            },
                        ],
                    },
                },
            },
        },
    }).catch((error: unknown) => console.error('Cookie preferences could not be initialized.', error));
}
