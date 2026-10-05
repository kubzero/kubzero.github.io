# ByteGlo website

Static GitHub Pages website for [byteglo.com](https://byteglo.com), with English
pages at their existing addresses and Estonian pages under `/et/`.

## Editing and building

Edit HTML in `_templates/`, translation text in `js/locales.js`, and product
release status, App Store links, and FAQs in `_data/apps.json`.
The root HTML files and `et/` are generated output: do not edit them directly.
The source templates keep both legal translations; each published page includes
only its own language. No packages are needed for the ordinary build.

```sh
node scripts/build-site.mjs
node scripts/build-site.mjs --check
python3 scripts/validate-site.py
```

Commit the generated pages, `sitemap.xml`, and any changed CSS/JS together with
their sources. GitHub Pages/Jekyll serves the committed HTML; `_config.yml`
excludes source templates and maintenance files from the published site.
Do not add `.nojekyll` without implementing equivalent publication exclusions.

WebP delivery copies are committed alongside original images. When adding or
replacing an image, run `python3 scripts/optimize-images.py` with Pillow installed
and rebuild. The normal site build uses the committed `_data/images.json`
manifest and does not require Pillow.

## Releasing an app

In `_data/apps.json`, set `released` to `true` only once the app can actually be
downloaded in its linked App Store region. Update any availability FAQ answers
in both languages, then rebuild. The builder enables the app page badges,
removes Coming soon, and adds the download URL and free-tier offer to JSON-LD.
No automatic release detection or scheduled switch is configured.

## Search visibility

See [the audit and remaining publishing steps](docs/seo-audit.md).
`robots.txt` permits ordinary search crawling, ChatGPT Search, and Perplexity;
GPTBot training is opted out independently. Robots rules are crawler preferences,
not access control. Public pages must never contain secrets.

Legal links without `.html` are generated as compatibility redirects. The historical `/apps/shortplant/` spelling redirects to `/apps/shotplant/`. Keep the original legal `.html` pages: App Store listings may still reference them.

Publication hygiene: Python tools, source templates/data, reports, local environments, cache files and macOS metadata are excluded from the Jekyll site. The validator checks the critical exclusions and rejects `.nojekyll`. Keep tools and sources in the repository so the static pages remain reproducible.
