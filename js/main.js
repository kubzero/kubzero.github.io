(function () {
  'use strict';

  var STORAGE_KEY = 'tarklend-lang';
  var SUPPORTED = ['et', 'ru', 'en'];

  /* Footer email: not in HTML; built on click from char-code arrays */
  var _f1 = [116, 97, 114, 107, 108, 101, 110, 100];
  var _f2 = [64, 109, 97, 105, 108, 46, 101, 101];
  function _mail() {
    return _f1.concat(_f2).map(function (c) { return String.fromCharCode(c); }).join('');
  }

  function getLang() {
    var stored = localStorage.getItem(STORAGE_KEY);
    return stored && SUPPORTED.indexOf(stored) !== -1 ? stored : 'et';
  }

  function setLang(code) {
    if (SUPPORTED.indexOf(code) === -1) return;
    localStorage.setItem(STORAGE_KEY, code);
    applyLocale(code);
    closeDropdown();
    updateTriggerLabel(code);
    setOptionSelected(code);
    document.documentElement.lang = code === 'et' ? 'et' : code === 'ru' ? 'ru' : 'en';
    try { document.dispatchEvent(new CustomEvent('tarklend:langChange', { detail: { lang: code } })); } catch (e) {}
  }

  function getText(obj, key) {
    var parts = key.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      cur = cur && cur[parts[i]];
    }
    return cur != null ? String(cur) : '';
  }

  function applyLocale(code) {
    var loc = window.LOCALES && window.LOCALES[code];
    if (!loc) return;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var text = getText(loc, key);
      if (text) el.textContent = text;
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria-label');
      var text = getText(loc, key);
      if (text) el.setAttribute('aria-label', text);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var text = getText(loc, key);
      if (text) el.setAttribute('title', text);
    });

    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-alt');
      var text = getText(loc, key);
      if (text) el.setAttribute('alt', text);
    });

    var titleEl = document.querySelector('title[data-i18n-document-title]');
    if (titleEl) {
      var titleKey = titleEl.getAttribute('data-i18n-document-title');
      var titleText = getText(loc, titleKey);
      if (titleText) document.title = titleText;
    }
  }

  function getServiceToggleLabels() {
    var code = getLang();
    var loc = window.LOCALES && window.LOCALES[code];
    var fallback = window.LOCALES && window.LOCALES.et;
    var more = getText(loc || fallback, 'services.cta.more') || 'Vaata rohkem';
    var hide = getText(loc || fallback, 'services.cta.hide') || 'Peida';
    return { more: more, hide: hide };
  }

  function updateTriggerLabel(code) {
    var trigger = document.getElementById('lang-trigger');
    var label = trigger && trigger.querySelector('.lang-trigger-label');
    if (label) label.textContent = code.toUpperCase();
  }

  function setOptionSelected(code) {
    document.querySelectorAll('.lang-option').forEach(function (btn) {
    btn.setAttribute('aria-selected', btn.getAttribute('data-lang') === code ? 'true' : 'false');
    });
  }

  var dropdown = document.getElementById('lang-dropdown');
  var trigger = document.getElementById('lang-trigger');

  function openDropdown() {
    if (dropdown) dropdown.classList.add('is-open');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
      var code = getLang();
      var loc = window.LOCALES && window.LOCALES[code];
      var fallback = window.LOCALES && window.LOCALES.et;
      var langAria = getText(loc || fallback, 'common.langSelectAria');
      if (langAria) trigger.setAttribute('aria-label', langAria);
    }
    document.addEventListener('click', outsideClose);
  }

  function closeDropdown() {
    if (dropdown) dropdown.classList.remove('is-open');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
    document.removeEventListener('click', outsideClose);
  }

  function toggleDropdown() {
    var open = dropdown && dropdown.classList.contains('is-open');
    if (open) closeDropdown(); else openDropdown();
  }

  function outsideClose(e) {
    if (!trigger || !dropdown) return;
    if (trigger.contains(e.target) || dropdown.contains(e.target)) return;
    closeDropdown();
  }

  if (trigger) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  document.querySelectorAll('.lang-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = this.getAttribute('data-lang');
      if (code) setLang(code);
    });
  });

  var current = getLang();
  applyLocale(current);
  updateTriggerLabel(current);
  setOptionSelected(current);
  document.documentElement.lang = current === 'et' ? 'et' : current === 'ru' ? 'ru' : 'en';

  /* Custom cursor – follows mouse; restore position after reload/navigation */
  (function () {
    var dot = document.getElementById('cursor-dot');
    if (!dot) return;
    var hot = 8;
    var raf = null;
    var x = 0;
    var y = 0;
    var hasPosition = false;
    var saveCursorKey = 'tarklend-cursor';
    var lastSave = 0;
    var pointerSelector = 'a, button, [role="button"], input[type="submit"], input[type="button"], .nav-link, .lang-trigger, .lang-option, .footer-icon';

    function restorePosition() {
      try {
        var saved = sessionStorage.getItem(saveCursorKey);
        if (saved) {
          var parts = saved.split(',');
          if (parts.length === 2) {
            var sx = parseInt(parts[0], 10);
            var sy = parseInt(parts[1], 10);
            if (!isNaN(sx) && !isNaN(sy) && sx >= -100 && sy >= -100 && sx <= 1e4 && sy <= 1e4) {
              x = sx;
              y = sy;
              hasPosition = true;
              dot.style.left = (x - hot) + 'px';
              dot.style.top = (y - hot) + 'px';
              dot.classList.remove('is-hidden');
              var prevPE = dot.style.pointerEvents;
              dot.style.pointerEvents = 'none';
              var el = document.elementFromPoint(sx, sy);
              dot.style.pointerEvents = prevPE;
              if (el && el.closest && el.closest(pointerSelector)) {
                dot.classList.add('is-pointer');
              }
              return true;
            }
          }
        }
      } catch (e) {}
      return false;
    }

    function move(e) {
      x = e.clientX;
      y = e.clientY;
      if (!hasPosition) {
        hasPosition = true;
        dot.classList.remove('is-hidden');
      }
      var target = e.target;
      var isPointer = target && target.closest && target.closest(pointerSelector);
      if (isPointer) {
        dot.classList.add('is-pointer');
      } else {
        dot.classList.remove('is-pointer');
      }
      if (raf == null) {
        raf = requestAnimationFrame(function () {
          raf = null;
          dot.style.left = (x - hot) + 'px';
          dot.style.top = (y - hot) + 'px';
          if (Date.now() - lastSave > 120) {
            lastSave = Date.now();
            try { sessionStorage.setItem(saveCursorKey, x + ',' + y); } catch (e) {}
          }
        });
      }
    }

    if (!restorePosition()) {
      dot.classList.add('is-hidden');
    }
    document.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mouseenter', function () {
      dot.classList.remove('is-hidden');
    });
    document.addEventListener('mouseleave', function () {
      dot.classList.add('is-hidden');
    });
  })();

  /* Services cards – expand/collapse details on button click */
  (function () {
    var serviceCards = document.querySelectorAll('.service-card');
    if (!serviceCards.length) return;

    function syncServiceButtonLabels() {
      var labels = getServiceToggleLabels();
      serviceCards.forEach(function (card) {
        var button = card.querySelector('.service-card__toggle');
        if (!button) return;
        var isOpen = button.getAttribute('aria-expanded') === 'true';
        button.textContent = isOpen ? labels.hide : labels.more;
      });
    }

    serviceCards.forEach(function (card, idx) {
      var button = card.querySelector('.service-card__toggle');
      var body = card.querySelector('.service-card__body');
      if (!button || !body) return;

      var bodyId = body.id || ('service-card-body-' + idx);
      body.id = bodyId;
      button.setAttribute('aria-controls', bodyId);

      button.addEventListener('click', function () {
        var labels = getServiceToggleLabels();
        var isOpen = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        button.textContent = isOpen ? labels.more : labels.hide;
        body.hidden = isOpen;
        card.classList.toggle('is-open', !isOpen);
      });
    });

    syncServiceButtonLabels();
    document.addEventListener('tarklend:langChange', syncServiceButtonLabels);
  })();

  /* Prices page cards – toggle offer details */
  (function () {
    var priceCards = document.querySelectorAll('.prices-card--toggle');
    if (!priceCards.length) return;

    priceCards.forEach(function (card, idx) {
      var button = card.querySelector('.prices-toggle-btn');
      var body = card.querySelector('.prices-toggle-body');
      if (!button || !body) return;

      var bodyId = body.id || ('prices-toggle-body-' + idx);
      body.id = bodyId;
      button.setAttribute('aria-controls', bodyId);

      button.addEventListener('click', function () {
        var isOpen = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        body.hidden = isOpen;
      });
    });
  })();

  document.querySelectorAll('.js-email-reveal').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = 'mailto:' + _mail();
    });
  });
})();
