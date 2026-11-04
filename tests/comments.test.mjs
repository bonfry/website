import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const pages = readdirSync('dist', { recursive: true }).filter(path => path.endsWith('.html'));

test('the build includes detail pages', () => {
    assert(pages.some(path => /^blog\/[^/]+\/index\.html$/.test(path)));
    assert(pages.some(path => /^talks\/[^/]+\/index\.html$/.test(path)));
});

for (const path of pages) {
    test(`comments on ${path}`, () => {
        const html = readFileSync(`dist/${path}`, 'utf8');
        const detail = /^(blog|talks)\/[^/]+\/index\.html$/.test(path);
        const scripts = html.match(/<script\b[^>]*src="https:\/\/giscus\.app\/client\.js"[^>]*>/g) ?? [];

        assert.equal(scripts.length, detail ? 1 : 0);
        assert.equal(html.includes('id="comments-heading"'), detail);
        if (!detail) return;

        assert(html.includes('href="https://github.com/bonfry/website/discussions"'));
        const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)[1];
        const backlink = html.match(/<meta\b[^>]*name="giscus:backlink"[^>]*content="([^"]+)"/)[1];
        assert.equal(backlink, canonical);
        assert(canonical.startsWith('https://bonfry.com/'));
        const script = scripts[0];
        const attributes = Object.fromEntries([...script.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
        assert.equal(attributes['data-term'], path.replace(/\/index\.html$/, ''));
        assert.equal(attributes['data-mapping'], 'specific');
        assert.equal(attributes['data-strict'], '1');
        assert.equal(attributes['data-repo'], 'bonfry/website');
        assert.equal(attributes['data-repo-id'], 'R_kgDOSZ_RRA');
        assert.equal(attributes['data-category'], 'Comments');
        assert(attributes['data-category-id'].startsWith('DIC_'));
        assert.equal(attributes['data-reactions-enabled'], '1');
        assert.equal(attributes['data-emit-metadata'], '0');
        assert.equal(attributes['data-input-position'], 'top');
        assert.equal(attributes['data-theme'], 'light');
        assert.equal(attributes['data-lang'], 'en');
        assert.equal(attributes['data-loading'], 'lazy');
        assert.equal(attributes.crossorigin, 'anonymous');
        assert(/\sasync(?:[\s=>])/.test(script));
        assert(!script.includes('type="module"'));
    });
}
