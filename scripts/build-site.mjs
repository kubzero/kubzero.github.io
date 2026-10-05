// Build crawlable English and Estonian HTML from the bilingual source templates.
// Uses only Node.js standard libraries. Run: node scripts/build-site.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const staleFiles = [];
function publish(file, content) {
  if (checkOnly) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) staleFiles.push(path.relative(root,file));
  } else {
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, content);
  }
}
const origin = 'https://byteglo.com';
const apps = JSON.parse(fs.readFileSync(path.join(root, '_data/apps.json'), 'utf8'));
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/locales.js'), 'utf8'), context);
const locales = context.window.LOCALES;
const images = JSON.parse(fs.readFileSync(path.join(root, '_data/images.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const lookup = (lang, key) => key.split('.').reduce((o, k) => o?.[k], locales[lang]);
const route = file => '/' + file.replace(/(^|\/)index\.html$/, '$1');
const localized = (file, lang) => (lang === 'et' ? '/et' : '') + route(file);
const url = (file, lang) => origin + localized(file, lang);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').slice(0, 10);
const assets = Object.fromEntries(['css/main.css', 'js/main.js', 'js/locales.js'].map(f => ['/' + f, hash(f)]));
const files = [];
function walk(dir, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) walk(path.join(dir, entry.name), name + '/');
    else if (name.endsWith('.html')) files.push(name);
  }
}
walk(path.join(root, '_templates'));
const knownRoutes = new Set(files.map(route));

function badge(slug) {
  const app = apps[slug];
  const href = app.storeUrl + `?itscg=30200&itsct=apps_box_badge&mttnsubad=${app.appleId}`;
  return `<a class="app-store-badge" href="${escape(href)}" rel="noopener noreferrer" aria-label="Download ${escape(locales.en[slug].name)} on the App Store"${app.released ? '' : ' hidden'}>\n              <img src="/images/badges/app-store-white-en.svg" alt="Download on the App Store" width="245" height="82">\n            </a>`;
}

function enrich(html, file, lang) {
  const slug = /^apps\/([^/]+)\/index\.html$/.exec(file)?.[1];
  if (slug) {
    const app = apps[slug];
    html = html.replace(/\s*<p class="app-release-status"[^>]*>[\s\S]*?<\/p>/g, '')
      .replace(/\s*<!-- After release:[\s\S]*?-->/g, '')
      .replace(/\s*<a class="app-store-badge"[\s\S]*?<\/a>/g, '');
    html = html.replace(new RegExp(`(<p class="lede" data-i18n="${slug}\\.lead">[\\s\\S]*?<\\/p>)`),
      `$1\n            ${app.released ? '' : '<p class="app-release-status" data-i18n="common.comingSoon">Coming soon</p>\n            '}${badge(slug)}`);
    const faq = app.faq[lang];
    const title = lang === 'et' ? 'Korduma kippuvad küsimused' : 'Frequently asked questions';
    const section = `      <section class="app-panel app-faq" aria-labelledby="app-faq-title">\n        <div class="app-panel-copy">\n          <h2 id="app-faq-title">${title}</h2>\n${faq.map(([q,a]) => `          <h3>${escape(q)}</h3>\n          <p>${escape(a)}</p>`).join('\n')}\n        </div>\n      </section>\n\n`;
    html = html.replace('      <section class="app-bottom-links">', section + '      <section class="app-bottom-links">');
  }
  if (file === 'index.html') {
    const title = lang === 'et' ? 'Meie rakendused' : 'Our apps';
    const cards = Object.keys(apps).map(id => `<li><a href="/apps/${id}/"><img src="/images/apps/${id}-icon.${id === 'backnest' ? 'jpg' : 'png'}" alt="" width="40" height="40"><span>${escape(locales[lang][id].name.split(':')[0])}</span></a></li>`).join('\n');
    const loopCards = cards + cards.replaceAll('<li>', '<li aria-hidden="true">').replaceAll('<a ', '<a tabindex="-1" ');
    const pause = lang === 'et' ? 'Peata kerimine' : 'Pause scrolling';
    const resume = lang === 'et' ? 'Jätka kerimist' : 'Resume scrolling';
    html = html.replace('    <footer class="site-footer">', `    <nav class="home-apps" aria-label="${title}">\n      <div class="home-app-window"><div class="home-app-track">\n        <ul class="home-app-list" aria-label="${title}">${loopCards}</ul>\n        <ul class="home-app-list home-app-copy" aria-hidden="true">${(cards + cards).replaceAll('<a ', '<a tabindex="-1" ')}</ul>\n      </div></div>\n      <button class="home-app-pause" type="button" aria-label="${pause}" data-pause-label="${pause}" data-resume-label="${resume}" aria-pressed="false">Ⅱ</button>\n    </nav>\n\n    <footer class="site-footer">`);
  }
  if (file === 'pages/apps.html') {
    html = html.replace(/\s*<a class="app-store-badge"[\s\S]*?<\/a>/g, '')
      .replace(/\s*<p class="app-release-status"[^>]*>[\s\S]*?<\/p>/g, '');
  }
  return html;
}

function render(source, file, lang) {
  let html = enrich(source, file, lang);
  // Publish only the matching legal text: translation works without JavaScript.
  html = html.replace(/<(article|div)([^>]*\bdata-lang-block="(en|et)"[^>]*)>([\s\S]*?)<\/\1>/g,
    (m, tag, attrs, blockLang, body) => blockLang !== lang ? '' : `<${tag}${attrs.replace(/\s+hidden(?:="[^"]*")?/g, '')}>${body}</${tag}>`);
  html = html.replace(/<([a-z][\w-]*)([^>]*\bdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/gi, (m, tag, attrs, key) => {
    const text = lookup(lang, key);
    if (text == null) throw new Error(`${file}: missing ${lang} translation ${key}`);
    return `<${tag}${attrs}>${escape(text)}</${tag}>`;
  });
  html = html.replace(/<([a-z][\w-]*)([^>]*\bdata-i18n-aria-label="([^"]+)"[^>]*)>/gi, (m, tag, attrs, key) => {
    const text = lookup(lang, key);
    if (text == null) throw new Error(`${file}: missing ${lang} label ${key}`);
    const label = ` aria-label="${escape(text)}"`;
    return `<${tag}${/\saria-label="/.test(attrs) ? attrs.replace(/\saria-label="[^"]*"/, label) : attrs + label}>`;
  });
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`);
  html = html.replace(/(<p[^>]*\bdata-cycle[^>]*>)[\s\S]*?(<\/p>)/, `$1${escape(locales[lang].hero.cycles[0])}$2`);
  // Normalize links/assets to root paths, then keep document links in this language.
  html = html.replace(/\b(href|src)="([^"]+)"/g, (m, attr, value) => {
    if (/^(#|mailto:|data:|tel:)/.test(value)) return m;
    const resolved = new URL(value.replace(/&amp;/g, '&'), origin + route(file));
    if (resolved.origin !== origin) return m;
    let pathname = resolved.pathname.replace(/\/index\.html$/, '/');
    if (knownRoutes.has(pathname)) pathname = (lang === 'et' ? '/et' : '') + pathname;
    if (assets[resolved.pathname]) resolved.search = '?v=' + assets[resolved.pathname];
    return `${attr}="${escape(pathname + resolved.search + resolved.hash)}"`;
  });
  html = html.replace(/<button[^>]*data-lang="(en|et)"[^>]*>\s*(EN|ET)\s*<\/button>/g, (m, code, label) =>
    `<a href="${localized(file, code)}" data-lang="${code}" lang="${code}" hreflang="${code}"${lang === code ? ' class="is-active" aria-current="page"' : ''}>${label}</a>`);
  html = html.replace(/<img\b[^>]*>/g, tag => {
    const src = /src="([^"]+)"/.exec(tag)?.[1];
    const image = images[src];
    if (!image) return tag;
    tag = tag.replace(`src="${src}"`, `src="${image.src}"`);
    // Correct screenshot aspect ratios without changing the display size of icons.
    if (/^\/images\/apps\/[^/]+\//.test(src)) {
      tag = tag.replace(/width="\d+"/, `width="${image.width}"`).replace(/height="\d+"/, `height="${image.height}"`);
    }
    return tag;
  });

  const titleKey = /data-title-key="([^"]+)"/.exec(html)?.[1];
  const descKey = /data-desc-key="([^"]+)"/.exec(html)?.[1];
  const title = titleKey ? lookup(lang, titleKey) : (lang === 'et' ? '404 — ByteGlo OÜ' : '404 — ByteGlo OÜ');
  const description = descKey ? lookup(lang, descKey) : (lang === 'et' ? 'Lehte ei leitud. Tutvu ByteGlo rakendustega või mine avalehele.' : 'Page not found. Explore ByteGlo apps or return to the home page.');
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`);
  // Remove old metadata and replace it with consistent localized values.
  html = html.replace(/\s*<meta (?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/g, '')
    .replace(/\s*<link rel="(?:canonical|alternate)"[^>]*>/g, '')
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  const slug = /^apps\/([^/]+)\//.exec(file)?.[1];
  const appPage = slug && file.endsWith('/index.html');
  const image = origin + (slug ? `/images/apps/${slug}-icon.${slug === 'backnest' ? 'jpg' : 'png'}` : '/images/logo.png');
  const meta = [
    `<meta name="description" content="${escape(description)}">`,
    `<meta name="robots" content="${file === '404.html' ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">`,
    ...(file === '404.html' ? [] : [`<link rel="canonical" href="${url(file, lang)}">`, ...['en','et','x-default'].map(code => `<link rel="alternate" hreflang="${code}" href="${url(file, code === 'x-default' ? 'en' : code)}">`)]),
    '<meta property="og:type" content="website">',
    `<meta property="og:url" content="${url(file, lang)}">`,
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:alt" content="${escape(slug ? locales[lang][slug].name : 'ByteGlo')}">`,
    '<meta property="og:site_name" content="ByteGlo">',
    `<meta property="og:locale" content="${lang === 'et' ? 'et_EE' : 'en_US'}">`,
    `<meta property="og:locale:alternate" content="${lang === 'et' ? 'en_US' : 'et_EE'}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escape(title)}">`,
    `<meta name="twitter:description" content="${escape(description)}">`,
    `<meta name="twitter:image" content="${image}">`
  ];
  if (file !== '404.html') {
    const org = { '@type':'Organization', '@id':origin+'/#organization', name:'ByteGlo OÜ', legalName:'ByteGlo OÜ', url:origin+'/', logo:origin+'/images/logo.png', identifier:{'@type':'PropertyValue',propertyID:'Estonian registry code',value:'17584494'}, address:{'@type':'PostalAddress',addressCountry:'EE'}, sameAs:['https://apps.apple.com/developer/id6807540443'] };
    const website = { '@type':'WebSite', '@id':origin+'/#website', url:origin+'/', name:'ByteGlo', inLanguage:['en','et'], publisher:{'@id':org['@id']} };
    const page = { '@type':file==='pages/apps.html'?'CollectionPage':'WebPage', '@id':url(file,lang)+'#webpage', url:url(file,lang), name:title, description, inLanguage:lang, isPartOf:{'@id':website['@id']}, publisher:{'@id':org['@id']} };
    const graph = [org,website,page];
    if (appPage) {
      const app=apps[slug];
      const software = { '@type':'SoftwareApplication', '@id':origin+`/apps/${slug}/#app`, name:locales[lang][slug].name, description:locales[lang][slug].lead, url:url(file,lang), image, operatingSystem:slug==='shotplant'?'macOS 14+':'iOS', applicationCategory:app.category, publisher:{'@id':org['@id']}, identifier:{'@type':'PropertyValue',propertyID:'Apple ID',value:app.appleId}, featureList:Object.keys(locales[lang][slug]).filter(k=>/^why\d$/.test(k)).map(k=>locales[lang][slug][k]), screenshot:[...html.matchAll(/<img src="(\/images\/apps\/[^"?]+\/[^"?]+)"/g)].map(m=>origin+m[1]) };
      if (app.released) Object.assign(software,{sameAs:[app.storeUrl],downloadUrl:app.storeUrl,offers:{'@type':'Offer',price:'0',priceCurrency:app.storeUrl.includes('/ee/')?'EUR':'USD',url:app.storeUrl}});
      page.mainEntity={'@id':software['@id']}; graph.push(software);
    }
    if (file==='pages/apps.html') graph.push({'@type':'ItemList','@id':url(file,lang)+'#apps',itemListElement:Object.keys(apps).map((id,i)=>({'@type':'ListItem',position:i+1,name:locales[lang][id].name,url:url(`apps/${id}/index.html`,lang)}))});
    if (file !== 'index.html') {
      const crumbs=[{name:locales[lang].nav.home,item:url('index.html',lang)}];
      if (slug) crumbs.push({name:locales[lang].nav.apps,item:url('pages/apps.html',lang)});
      if (slug && !appPage) crumbs.push({name:locales[lang][slug].name,item:url(`apps/${slug}/index.html`,lang)});
      crumbs.push({name:appPage?locales[lang][slug].name:title,item:url(file,lang)});
      const breadcrumb={'@type':'BreadcrumbList','@id':url(file,lang)+'#breadcrumbs',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,...c}))};
      page.breadcrumb={'@id':breadcrumb['@id']};graph.push(breadcrumb);
    }
    meta.push('<script type="application/ld+json">\n'+JSON.stringify({'@context':'https://schema.org','@graph':graph},null,2).replace(/</g,'\\u003c')+'\n  </script>');
  }
  html=html.replace('</head>', '  '+meta.join('\n  ')+'\n</head>');
  if (file==='apps/hideroll/terms.html' && lang==='et') {
    html=html.replace('<h1>Terms of Use — Hideroll</h1>','<h1>Kasutustingimused — Hideroll</h1>');
  }
  return html.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}

for (const file of files) for (const lang of ['en','et']) {
  const destination=path.join(root,lang==='et'?'et':'',file);
  publish(destination,render(fs.readFileSync(path.join(root,'_templates',file),'utf8'),file,lang));
}
// Keep extensionless legal links used in App Store listings working.
const aliases = files.filter(file => /\/(privacy|terms)\.html$/.test(file)).map(file => [file.replace(/\.html$/, '/index.html'), file]);
aliases.push(['apps/shortplant/index.html', 'apps/shotplant/index.html']);
for (const [alias, destination] of aliases) for (const lang of ['en', 'et']) {
  const target = localized(destination, lang);
  const title = lang === 'et' ? 'Leht on kolinud' : 'Page moved';
  const label = lang === 'et' ? 'Ava leht' : 'Continue to the page';
  publish(path.join(root, lang === 'et' ? 'et' : '', alias), `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — ByteGlo</title>
  <meta name="description" content="${label} — ByteGlo.">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${origin}${target}">
  <meta http-equiv="refresh" content="0; url=${target}">
</head>
<body><main><h1>${title}</h1><p><a href="${target}">${label}</a></p></main></body>
</html>
`);
}
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+files.filter(f=>f!=='404.html').flatMap(file=>['en','et'].map(lang=>`  <url><loc>${url(file,lang)}</loc>${['en','et','x-default'].map(code=>`<xhtml:link rel="alternate" hreflang="${code}" href="${url(file,code==='x-default'?'en':code)}"/>`).join('')}</url>`)).join('\n')+'\n</urlset>\n';
publish(path.join(root,'sitemap.xml'),sitemap);
if (staleFiles.length) throw new Error('Generated pages are stale. Run node scripts/build-site.mjs:\n'+staleFiles.join('\n'));
console.log(`${checkOnly?'Checked':'Built'} ${files.length*2} HTML pages and ${2*(files.length-1)} sitemap entries.`);
