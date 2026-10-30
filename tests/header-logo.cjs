// Theme-logo contracts: shared exact silhouette, CSS token colour and responsive sizes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root=`${__dirname}/..`;
const html=fs.readFileSync(`${root}/index.html`,'utf8');
const css=fs.readFileSync(`${root}/styles.css`,'utf8');
const svg=fs.readFileSync(`${root}/assets/resettable-logo-mask.svg`,'utf8');
for(const tag of ['header','footer']) {
  const section=html.match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`))[0];
  assert.match(section,/class="logo-light" src="assets\/resettable-future-logo.png"/);
  assert.match(section,/<span class="logo-dark" role="img" aria-label="Resettable"><\/span>/);
}
assert.match(svg,/width="614" height="160" viewBox="0 0 614 160"/);
assert.match(svg,/mask-type:alpha/);assert.match(svg,/fill="white" mask="url\(#logo\)"/);
assert(Buffer.from(svg.match(/base64,([^"]+)/)[1],'base64').equals(fs.readFileSync(`${root}/assets/resettable-future-logo.png`)));
const shared=css.match(/\.brand \.logo-dark, \.footer-brand-link \.logo-dark \{([^}]+)\}/)[1];
assert.match(shared,/display: none/);assert.match(shared,/aspect-ratio: 614 \/ 160/);
assert.match(shared,/color: var\(--deep\)/);assert.match(shared,/background-color: currentColor/);
assert.match(shared,/-webkit-mask: url\("assets\/resettable-logo-mask.svg"\)/);
assert.match(shared,/\bmask: url\("assets\/resettable-logo-mask.svg"\)/);
// Captions and masks resolve exactly the same existing colour token.
assert.match(css,/\.brand span \{ color: var\(--deep\)/);
assert.match(css,/\.footer-inner a \{ color: var\(--deep\)/);
assert.match(css,/:root\[data-theme="dark"\] \.brand \.logo-light,\s*:root\[data-theme="dark"\] \.footer-brand-link \.logo-light \{ display: none; \}/);
assert.match(css,/:root\[data-theme="dark"\] \.brand \.logo-dark,\s*:root\[data-theme="dark"\] \.footer-brand-link \.logo-dark \{ display: block; \}/);
assert(!/(?:\.brand|\.footer-brand-link)[^{}]*\{[^}]*\bfilter:/.test(css));
assert(!/data-theme="dark"[^{}]*(?:\.brand|\.footer-brand-link)[^{}]*\{[^}]*background:\s*#f6f3eb/.test(css));
for(const width of [154,140,142]) assert(css.includes(`.brand img, .brand .logo-dark { width: ${width}px;`));
for(const width of [88,78]) assert(css.includes(`.footer-brand-link img, .footer-brand-link .logo-dark { width: ${width}px;`));
assert(fs.readFileSync(`${root}/service-worker.js`,'utf8').includes('"assets/resettable-logo-mask.svg"'));
console.log('PASS header/footer logos: shared original alpha mask, matching caption token, transparent surrounds, Light unchanged, responsive phone/tablet/desktop sizing and offline asset.');
