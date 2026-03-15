/**
 * TarkLend – News feed from Sanity.io
 * Set your project ID and dataset below after creating a project at https://www.sanity.io
 */
(function () {
  'use strict';

  var SANITY_PROJECT_ID = 'b9gnaqq4';
  var SANITY_DATASET = 'production';
  var API_VERSION = '2025-01-01';

  var LANG_STORAGE_KEY = 'tarklend-lang';
  var LANG_SUPPORTED = ['et', 'ru', 'en'];
  var PAGE_SIZE = 10;
  var currentPage = 1;
  var allItems = [];
  var paginationReady = false;

  /* GROQ: filter by type + current language. */
  var GROQ = '*[_type in ["newsPost", "post", "tarklend_post"] && lower(lang) == $lang] { _id, title, lang, publishedAt, "date": date, excerpt, "plaintextBody": pt::text(body), "imageUrl": mainImage.asset->url, "imageUrlAlt": image.asset->url, "sortDate": coalesce(publishedAt, date) } | order(sortDate desc) [0...50]';

  function normalizeLang(value) {
    if (!value) return '';
    var v = String(value).toLowerCase().split('-')[0];
    return LANG_SUPPORTED.indexOf(v) !== -1 ? v : '';
  }

  function getNewsLang() {
    var htmlLang = normalizeLang(document.documentElement.lang);
    if (htmlLang) return htmlLang;

    var stored = normalizeLang(localStorage.getItem(LANG_STORAGE_KEY));
    return stored || 'et';
  }

  function getNewsUrl(lang) {
    var l = lang && LANG_SUPPORTED.indexOf(lang) !== -1 ? lang : 'et';
    var base = 'https://' + SANITY_PROJECT_ID + '.api.sanity.io/v' + API_VERSION + '/data/query/' + SANITY_DATASET;
    /* HTTP query params are JSON values; strings must be quoted. */
    return base + '?query=' + encodeURIComponent(GROQ) + '&$lang=' + encodeURIComponent(JSON.stringify(l));
  }

  function getNewsText(key) {
    var lang = getNewsLang();
    var loc = window.LOCALES && window.LOCALES[lang];
    var fallback = window.LOCALES && window.LOCALES.et;
    return (loc && loc.news && loc.news[key]) || (fallback && fallback.news && fallback.news[key]) || '';
  }

  function getPageInfoText(current, total) {
    var template = getNewsText('pageInfo') || 'Page {current} / {total}';
    return template
      .replace('{current}', String(current))
      .replace('{total}', String(total));
  }

  function filterItemsByLang(items, lang) {
    if (!Array.isArray(items)) return [];
    var normalizedLang = normalizeLang(lang) || 'et';
    return items.filter(function (item) {
      return normalizeLang(item && item.lang) === normalizedLang;
    });
  }

  function toTimestamp(item) {
    if (!item) return 0;
    var raw = item.sortDate || item.publishedAt || item.date || '';
    var ts = Date.parse(raw);
    return isNaN(ts) ? 0 : ts;
  }

  function sortNewestFirst(items) {
    if (!Array.isArray(items)) return [];
    return items.slice().sort(function (a, b) {
      return toTimestamp(b) - toTimestamp(a);
    });
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(document.documentElement.lang || 'et', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function renderFeed(container, items) {
    if (!container || !Array.isArray(items)) return;
    if (items.length === 0) {
      container.innerHTML = '<p class="news-empty">' + escapeHtml(getNewsText('empty') || 'Uudiseid pole.') + '</p>';
      return;
    }
    var html = items.map(function (post, i) {
      var imgUrl = post.imageUrl || post.imageUrlAlt;
      var imgWrap = imgUrl
        ? '<div class="news-card__img-wrap"><img src="' + escapeAttr(imgUrl) + '" alt="" class="news-card__img" loading="lazy"></div>'
        : '';
      var excerpt = post.excerpt ? '<p class="news-card__excerpt">' + escapeHtml(post.excerpt) + '</p>' : '';
      var bodyText = post.plaintextBody ? '<div class="news-card__body-text">' + escapeHtml(post.plaintextBody) + '</div>' : '';
      var date = formatDate(post.publishedAt || post.date);
      var delay = i % 6;
      return (
        '<article class="news-card news-card--animate" style="--card-delay: ' + delay + '" data-index="' + i + '">' +
        '<div class="news-card__accent"></div>' +
        imgWrap +
        '<div class="news-card__body">' +
        '<time class="news-card__date" datetime="' + escapeAttr(post.publishedAt || post.date || '') + '">' + escapeHtml(date) + '</time>' +
        '<h2 class="news-card__title">' + escapeHtml(post.title || '') + '</h2>' +
        excerpt +
        bodyText +
        '</div>' +
        '</article>'
      );
    }).join('');
    container.innerHTML = html;
  }

  function updatePagination(container) {
    var wrap = document.getElementById('news-pagination');
    var prev = document.getElementById('news-prev');
    var next = document.getElementById('news-next');
    var info = document.getElementById('news-page-info');
    if (!wrap || !prev || !next || !info) return;

    var totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    if (allItems.length <= PAGE_SIZE) {
      wrap.hidden = true;
    } else {
      wrap.hidden = false;
    }

    info.textContent = getPageInfoText(currentPage, totalPages);
    prev.disabled = currentPage === 1;
    next.disabled = currentPage === totalPages;

    var start = (currentPage - 1) * PAGE_SIZE;
    var end = start + PAGE_SIZE;
    renderFeed(container, allItems.slice(start, end));
  }

  function initPaginationControls(container) {
    if (paginationReady) return;
    var prev = document.getElementById('news-prev');
    var next = document.getElementById('news-next');
    if (!prev || !next) return;

    prev.addEventListener('click', function () {
      currentPage -= 1;
      updatePagination(container);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    next.addEventListener('click', function () {
      currentPage += 1;
      updatePagination(container);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    paginationReady = true;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function run() {
    var container = document.getElementById('news-feed');
    if (!container) return;
    initPaginationControls(container);

    if (!SANITY_PROJECT_ID || SANITY_PROJECT_ID === 'YOUR_PROJECT_ID') {
      var notConfigured = getNewsText('notConfigured') || 'Uudiste voog pole seadistatud. Lisa Sanity projekti ID faili';
      container.innerHTML = '<p class="news-empty">' + escapeHtml(notConfigured) + ' <code>js/sanity-news.js</code>.</p>';
      var missingWrap = document.getElementById('news-pagination');
      if (missingWrap) missingWrap.hidden = true;
      return;
    }

    container.classList.add('news-feed--loading');
    var loadingWrap = document.getElementById('news-pagination');
    if (loadingWrap) loadingWrap.hidden = true;
    var lang = getNewsLang();
    fetch(getNewsUrl(lang))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        container.classList.remove('news-feed--loading');
        var items = filterItemsByLang((data && data.result) ? data.result : [], lang);
        allItems = sortNewestFirst(items);
        currentPage = 1;
        updatePagination(container);
      })
      .catch(function () {
        container.classList.remove('news-feed--loading');
        var failedWrap = document.getElementById('news-pagination');
        if (failedWrap) failedWrap.hidden = true;
        container.innerHTML = '<p class="news-empty">' + escapeHtml(getNewsText('loadFailed') || 'Uudiste laadimine ebaõnnestus.') + '</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  document.addEventListener('tarklend:langChange', function () {
    if (!SANITY_PROJECT_ID || SANITY_PROJECT_ID === 'YOUR_PROJECT_ID') return;
    run();
  });
})();
