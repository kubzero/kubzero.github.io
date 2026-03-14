/**
 * Contact page: phone number reveal (obfuscated so number is not stored in plain text).
 * Number is built from a character-code sequence at runtime.
 */
(function () {
  'use strict';

  /* eslint-disable no-unused-vars */
  var _0x = [0x2b, 0x33, 0x37, 0x32, 0x35, 0x35, 0x34, 0x36, 0x32, 0x35, 0x32];
  function _d() {
    return _0x.map(function (c) { return String.fromCharCode(c); }).join('');
  }
  /* eslint-enable no-unused-vars */

  var btn = document.getElementById('contact-phone-btn');
  var link = document.getElementById('contact-phone-link');
  if (!btn || !link) return;

  btn.addEventListener('click', function () {
    var n = _d();
    link.href = 'tel:' + n;
    link.textContent = n;
    link.style.display = '';
    btn.style.display = 'none';
  });
})();
