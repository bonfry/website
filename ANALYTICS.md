# Google Analytics 4

Implementazione basata sulla [guida di Daniel García](https://daniel.es/blog/the-ultimate-astro-google-analytics-guide/), aggiornata e verificata il 4 novembre 2026 per Astro 7.4.5.

## Configurazione

Serve il **Measurement ID** del flusso web GA4, nel formato `G-XXXXXXXXXX`. È pubblico per natura: compare nel browser e nelle richieste al tag Google. Un file `.env` o un GitHub Secret non possono renderlo segreto nell'HTML pubblicato. Non inserire API secret, chiavi di service account o credenziali OAuth: questa integrazione non ne usa. Google richiede che gli [API secret del Measurement Protocol restino privati](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events).

In locale, copia `.env.example` in `.env` e imposta:

```dotenv
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

I file `.env` sono esclusi da Git. Il valore viene validato durante la generazione delle pagine. Se manca, Analytics e banner sono disattivati. `npm run dev` non li attiva; per provarli usa `npm run build` e `npm run preview`. Usa una proprietà di test per evitare di contaminare le statistiche reali.

Per GitHub Pages, in **Settings → Secrets and variables → Actions → Variables**, crea la repository variable `PUBLIC_GA_MEASUREMENT_ID`. Il workflow la passa alla build di Astro. Dopo una modifica del valore occorre una nuova build e pubblicazione: GitHub Pages serve file statici. Non sono state modificate impostazioni remote né avviati deploy.

## Versioni e differenze rispetto all'articolo

| Libreria | Ultima versione verificata | Scelta nel progetto |
| --- | --- | --- |
| `vanilla-cookieconsent` | 3.3.0 | Installata con versione esatta e lockfile |
| `@astrojs/partytown` | 2.1.9 | Opzionale, non installata |
| `@qwik.dev/partytown` | 1.0.3 | Motore attuale dell'integrazione Astro, non installato |

Le versioni sono state controllate sul registry npm (`/<nome-pacchetto>/latest`), oltre alle fonti ufficiali seguenti:

- [CookieConsent 3.3.0](https://github.com/orestbida/cookieconsent/releases/tag/v3.3.0), pubblicata il 3 novembre: aggiunge `exports` e un default export ESM, corregge scroll lock con `root`, inserimento del modale in `body` e isolamento di alcuni stili. Gli import dal pacchetto e del CSS usati qui sono compatibili. Alcune pagine della documentazione mostrano ancora 3.2.1.
- [CookieConsent 3.2.0](https://github.com/orestbida/cookieconsent/releases/tag/v3.2.0) e [3.2.1](https://github.com/orestbida/cookieconsent/releases/tag/v3.2.1): correzioni di accessibilità e gestione del consenso; nuova opzione `respectGpc`, non abilitata da questa configurazione. In modalità opt-out cambiano anche i valori restituiti dalle API prima della scelta: qui si usa esplicitamente opt-in.
- [Integrazione Astro Partytown](https://docs.astro.build/en/guides/integrations-guide/partytown/): l'API `partytown({ config: { forward: ['dataLayer.push'] } })` rimane documentata. Partytown sposta gli script in un worker, non nasconde il Measurement ID. La [documentazione Partytown](https://partytown.qwik.dev/google-tag-manager/) segnala che `user_engagement` all'uscita dalla pagina è inaffidabile nel worker. Per questa integrazione con consenso si mantiene il tag asincrono nel browser.
- [Consent Mode di Google](https://developers.google.com/tag-platform/security/guides/consent): il consenso predefinito deve precedere i comandi che inviano dati. La scelta analytics abilita soltanto `analytics_storage`; diversamente da alcuni esempi dell'articolo, non abilita i tre consensi pubblicitari.
- La variante avanzata dell'articolo carica Google anche con consenso negato. Qui si usa il comportamento di **Basic Consent Mode**: nessun caricamento del tag o invio ad Analytics prima dell'accettazione. Il consenso negato in modalità avanzata può comunque consentire ping senza cookie; non equivale ad assenza di trasmissione.
- [CookieConsent e Google](https://cookieconsent.orestbida.com/advanced/google-consent-mode.html): la scelta salvata viene letta nei callback `onConsent` e `onChange`. Alla revoca si attiva il [blocco della misurazione Google](https://developers.google.com/tag-platform/security/guides/privacy), si cancellano `_ga` / `_ga_*` e si ricarica la pagina per rimuovere anche i listener del tag. La cancellazione non elimina dati già inviati.
- Il sito usa navigazioni complete e non importa `ClientRouter` di Astro. Le patch dell'articolo per View Transitions non servono. Se verrà introdotto il router client, occorrerà gestire persistenza del banner e navigazioni, evitando page view duplicate: vedere la [documentazione Astro](https://docs.astro.build/en/guides/view-transitions/).

## Comportamento e verifica

Il componente nel layout condiviso copre Home, CV, blog e talk. I file statici in `public/` restano fuori dal layout. Il banner è in inglese, come il sito, con accettazione e rifiuto di uguale evidenza e preferenze riapribili dal footer. La scelta viene conservata per 180 giorni in `cc_cookie`. Google Signals e personalizzazione pubblicitaria sono disabilitati.

Esegui `npm test` e `npm run build`. Nella preview, controlla in una sessione pulita che non partano richieste a `googletagmanager.com` o `google-analytics.com` prima della scelta o dopo il rifiuto. Accetta e verifica un solo caricamento del tag, poi riapri le preferenze, rifiuta e verifica cancellazione dei cookie e ricaricamento. Una visita successiva deve rispettare la scelta salvata.

Prima di pubblicare, occorre predisporre l'informativa privacy/cookie del titolare e verificarne i contenuti e le impostazioni della proprietà GA4. Il banner e Consent Mode da soli non attestano la conformità normativa; il link a Google nel modale descrive il fornitore e non sostituisce l'informativa del sito. Questa modifica non configura conservazione dati, Google Signals o altre opzioni nell'account Google.
