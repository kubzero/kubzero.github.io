(function () {
  "use strict";

  var STORAGE_KEY = "byteglo-lang";
  var SUPPORTED = ["en", "et"];
  var cycleTimer = null;
  var cycleIndex = 0;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) {}
    return "en";
  }

  function setLang(code) {
    if (SUPPORTED.indexOf(code) === -1) return;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {}
    applyLocale(code);
  }

  function getText(obj, key) {
    var parts = key.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      cur = cur && cur[parts[i]];
    }
    return cur != null ? String(cur) : "";
  }

  function applyLocale(code) {
    var loc = window.LOCALES && window.LOCALES[code];
    if (!loc) return;

    document.documentElement.lang = code;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var text = getText(loc, el.getAttribute("data-i18n"));
      if (text) el.textContent = text;
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      var text = getText(loc, el.getAttribute("data-i18n-aria-label"));
      if (text) el.setAttribute("aria-label", text);
    });

    var titleKey = document.body.getAttribute("data-title-key");
    var descKey = document.body.getAttribute("data-desc-key");
    if (titleKey) {
      var titleText = getText(loc, titleKey);
      if (titleText) document.title = titleText;
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && titleText) ogTitle.setAttribute("content", titleText);
    }
    if (descKey) {
      var descText = getText(loc, descKey);
      if (descText) {
        var metaDesc = document.querySelector('meta[name="description"]');
        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (metaDesc) metaDesc.setAttribute("content", descText);
        if (ogDesc) ogDesc.setAttribute("content", descText);
      }
    }

    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === code;
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.classList.toggle("is-active", active);
    });

    document.querySelectorAll("[data-lang-block]").forEach(function (el) {
      el.hidden = el.getAttribute("data-lang-block") !== code;
    });

    startCycle(loc);
  }

  function startCycle(loc) {
    var el = document.querySelector("[data-cycle]");
    if (cycleTimer) {
      clearInterval(cycleTimer);
      cycleTimer = null;
    }
    if (!el || !loc || !loc.hero || !loc.hero.cycles || !loc.hero.cycles.length) return;

    var phrases = loc.hero.cycles;
    cycleIndex = 0;
    el.textContent = phrases[0];
    el.classList.remove("cycle-out", "cycle-in");

    if (reduceMotion || phrases.length < 2) return;

    cycleTimer = setInterval(function () {
      el.classList.remove("cycle-in");
      el.classList.add("cycle-out");
      window.setTimeout(function () {
        cycleIndex = (cycleIndex + 1) % phrases.length;
        el.textContent = phrases[cycleIndex];
        el.classList.remove("cycle-out");
        el.classList.add("cycle-in");
      }, 550);
    }, 3400);
  }

  document.querySelectorAll("[data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLang(btn.getAttribute("data-lang"));
    });
  });

  applyLocale(getLang());

  var _u = [99, 111, 110, 116, 97, 99, 116];
  var _h = [98, 121, 116, 101, 103, 108, 111, 46, 99, 111, 109];
  function mail() {
    return _u.concat([64], _h).map(function (c) {
      return String.fromCharCode(c);
    }).join("");
  }

  document.querySelectorAll(".js-email-reveal").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var a = document.createElement("a");
      var addr = mail();
      a.href = "mailto:" + addr;
      a.textContent = addr;
      btn.replaceWith(a);
    });
  });
})();
