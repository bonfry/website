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
                        description: 'With your permission, Google Analytics helps measure visits and how this site is used. Google Analytics only loads after you accept. You can change your choice at any time in the footer.',
                        acceptAllBtn: 'Accept analytics',
                        acceptNecessaryBtn: 'Reject analytics',
                        showPreferencesBtn: 'Manage preferences',
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
                            },
                            {
                                title: 'Google Analytics 4',
                                description: 'Optional analytics sends usage data to Google and uses _ga and _ga_* cookies to distinguish visits. Advertising consent stays denied. Withdrawing consent deletes these cookies and reloads the page to stop analytics. Read <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google’s privacy policy</a>.',
                                linkedCategory: 'analytics',
                            },
                        ],
                    },
                },
            },
        },
    }).catch((error: unknown) => console.error('Cookie preferences could not be initialized.', error));
}
