import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(
    readFileSync(new URL('../src/scripts/analytics.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function setup(measurementId = 'G-TEST123456') {
    let config;
    let accepted = false;
    const scripts = [];
    const window = {};
    runInNewContext(source, {
        exports: {}, window, console,
        require: () => ({
            default: {
                acceptedCategory: () => accepted,
                run: (value) => { config = value; return Promise.resolve(); },
            },
        }),
        document: {
            querySelector: () => measurementId ? { dataset: { gaMeasurementId: measurementId } } : null,
            createElement: () => ({}),
            head: { append: (script) => scripts.push(script) },
        },
    });
    return {
        config, window, scripts,
        consent(value, callback = 'onConsent') { accepted = value; config[callback](); },
    };
}

test('no configuration means no banner and no Google script', () => {
    const state = setup('');
    assert.equal(state.config, undefined);
    assert.equal(state.scripts.length, 0);
});

test('no choice or a saved rejection never initializes Google', () => {
    const state = setup();
    assert.equal(state.config.mode, 'opt-in');
    assert.equal(state.config.categories.analytics.enabled, undefined);
    assert.equal(state.scripts.length, 0);
    state.consent(false);
    assert.equal(state.scripts.length, 0);
    assert.equal(state.window.dataLayer, undefined);
    assert.equal(state.window['ga-disable-G-TEST123456'], true);
});

test('first or saved consent initializes once, with advertising denied before config', () => {
    const state = setup();
    state.consent(true);
    state.consent(true, 'onChange');
    assert.equal(state.scripts.length, 1);
    assert.equal(state.scripts[0].async, true);
    assert.equal(state.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-TEST123456');
    const commands = Array.from(state.window.dataLayer, (args) => Array.from(args));
    assert.deepEqual(commands.map((args) => args.slice(0, 2)), [
        ['consent', 'default'], ['consent', 'update'], ['js', commands[2][1]], ['config', 'G-TEST123456'],
    ]);
    for (const key of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
        assert.equal(commands[0][2][key], 'denied');
    }
    assert.equal(commands[1][2].analytics_storage, 'granted');
    assert.equal(commands[1][2].ad_storage, undefined);
    assert.equal(commands[3][2].allow_google_signals, false);
    assert.equal(commands[3][2].allow_ad_personalization_signals, false);
    assert.equal(commands[3][2].cookie_expires, 63072000);
});

test('consent information links the site policies and matches cookie lifetimes', () => {
    const { config } = setup();
    const { consentModal, preferencesModal } = config.language.translations.en;
    assert.match(consentModal.footer, /href="\/privacy"/);
    assert.match(consentModal.footer, /74971648\/cookie-policy/);
    const necessary = preferencesModal.sections.find((section) => section.linkedCategory === 'necessary');
    assert.equal(necessary.cookieTable.body[0].duration, `${config.cookie.expiresAfterDays} days`);
    const analytics = preferencesModal.sections.find((section) => section.linkedCategory === 'analytics');
    assert.match(analytics.description, /Google Ireland Limited/);
    assert.deepEqual(Array.from(analytics.cookieTable.body, (row) => [row.name, row.duration]), [
        ['_ga', '2 years'], ['_ga_*', '2 years'],
    ]);
    assert.match(preferencesModal.sections.at(-1).description, /mailto:info@bonfry.com/);
});

test('revocation disables measurement and configures cookie cleanup and reload', () => {
    const state = setup();
    state.consent(true);
    state.consent(false, 'onChange');
    assert.equal(state.window['ga-disable-G-TEST123456'], true);
    assert.equal(state.window.dataLayer.at(-1)[2].analytics_storage, 'denied');
    const cleanup = state.config.categories.analytics.autoClear;
    assert.equal(cleanup.reloadPage, true);
    assert.equal(cleanup.cookies[0].name.test('_ga'), true);
    assert.equal(cleanup.cookies[0].name.test('_ga_TEST123456'), true);
    assert.equal(cleanup.cookies[0].name.test('_garden'), false);
});
