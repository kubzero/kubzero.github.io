/**
 * Contact page: phone and email reveal (obfuscated – not stored as plain text).
 * Values are built at runtime from split character-code arrays.
 */
(function () {
  'use strict';

  /* phone: char codes in two segments */
  var _a = [0x2b, 0x33, 0x37, 0x32, 0x35];
  var _b = [0x35, 0x34, 0x36, 0x32, 0x35, 0x32];
  function _ph() {
    return _a.concat(_b).map(function (c) { return String.fromCharCode(c); }).join('');
  }

  /* email: char codes in two segments */
  var _p = [116, 97, 114, 107, 108, 101, 110, 100];
  var _q = [64, 109, 97, 105, 108, 46, 101, 101];
  function _em() {
    return _p.concat(_q).map(function (c) { return String.fromCharCode(c); }).join('');
  }

  var phoneBtn = document.getElementById('contact-phone-btn');
  var phoneLink = document.getElementById('contact-phone-link');
  if (phoneBtn && phoneLink) {
    phoneBtn.addEventListener('click', function () {
      var n = _ph();
      phoneLink.href = 'tel:' + n;
      phoneLink.textContent = n;
      phoneLink.style.display = '';
      phoneBtn.style.display = 'none';
    });
  }

  var emailBtn = document.getElementById('contact-email-btn');
  var emailLink = document.getElementById('contact-email-link');
  if (emailBtn && emailLink) {
    emailBtn.addEventListener('click', function () {
      var addr = _em();
      emailLink.href = 'mailto:' + addr;
      emailLink.textContent = addr;
      emailLink.style.display = '';
      emailBtn.style.display = 'none';
    });
  }
})();
