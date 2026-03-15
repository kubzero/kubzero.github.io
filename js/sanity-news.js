/**
 * TarkLend – News feed from Sanity.io
 * Set your project ID and dataset below after creating a project at https://www.sanity.io
 */
(function () {
  'use strict';

  var SANITY_PROJECT_ID = 'b9gnaqq4';
  var SANITY_DATASET = 'production';
  var API_VERSION = '2025-01-01';

  /* GROQ: newsPost or post; body as plain text via pt::text(); ordered by date desc.
   * Post layout: build HTML in renderFeed() below. Styles: css/main.css .news-card* */
  var GROQ = '*[_type in ["newsPost", "post"]] { _id, title, slug, publishedAt, "date": date, excerpt, "plaintextBody": pt::text(body), "imageUrl": mainImage.asset->url, "imageUrlAlt": image.asset->url, "sortDate": coalesce(publishedAt, date) } | order(sortDate desc) [0...50]';

  function getNewsUrl() {
    var base = 'https://' + SANITY_PROJECT_ID + '.api.sanity.io/v' + API_VERSION + '/data/query/' + SANITY_DATASET;
    return base + '?query=' + encodeURIComponent(GROQ);
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
      container.innerHTML = '<p class="news-empty">Uudiseid pole.</p>';
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

    if (!SANITY_PROJECT_ID || SANITY_PROJECT_ID === 'YOUR_PROJECT_ID') {
      container.innerHTML = '<p class="news-empty">Uudiste voog pole seadistatud. Lisa Sanity projekti ID faili <code>js/sanity-news.js</code>.</p>';
      return;
    }

    container.classList.add('news-feed--loading');
    fetch(getNewsUrl())
      .then(function (res) { return res.json(); })
      .then(function (data) {
        container.classList.remove('news-feed--loading');
        var items = (data && data.result) ? data.result : [];
        renderFeed(container, items);
      })
      .catch(function () {
        container.classList.remove('news-feed--loading');
        container.innerHTML = '<p class="news-empty">Uudiste laadimine ebaõnnestus.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
