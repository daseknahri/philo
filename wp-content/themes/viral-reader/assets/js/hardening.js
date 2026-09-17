/* Viral Reader — Presentation Hardening JS (opt-in, brand-neutral).
   Injects a per-heading anchor-copy control on singular content. Reuses the
   theme's vrL10n strings for i18n. No dependencies, no jQuery. Paired with
   assets/css/hardening.css and the vr_enable_presentation_hardening filter. */
(function () {
  'use strict';

  var L = (typeof window.vrL10n === 'object' && window.vrL10n) || {};
  var COPIED = L.copied || 'Link copied';

  function ready(fn) {
    if (document.readyState !== 'loading') { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  }

  function slugify(s) {
    return (s || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve) {
      var t = document.createElement('textarea');
      t.value = text;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch (e) { /* no-op */ }
      document.body.removeChild(t);
      resolve();
    });
  }

  ready(function () {
    var scope = document.querySelector('.entry-content');
    if (!scope) { return; }

    var headings = scope.querySelectorAll('h2, h3');
    if (!headings.length) { return; }

    var toast = document.createElement('div');
    toast.className = 'vr-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = COPIED;
    document.body.appendChild(toast);

    var toastTimer;
    function showToast() {
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toast.classList.remove('is-visible');
      }, 1800);
    }

    var used = {};
    headings.forEach(function (h) {
      if (h.querySelector('.vr-anchor')) { return; }

      if (!h.id) {
        var base = slugify(h.textContent) || 'section';
        var id = base, n = 2;
        while (document.getElementById(id) || used[id]) { id = base + '-' + n++; }
        h.id = id;
      }
      used[h.id] = true;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vr-anchor';
      btn.setAttribute('aria-label', L.copyPrompt || 'Copy link to this section');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"></path><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"></path></svg>';

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var url = location.origin + location.pathname + '#' + h.id;
        copy(url).then(function () {
          btn.classList.add('is-copied');
          showToast();
          try { history.replaceState(null, '', '#' + h.id); } catch (_) { /* no-op */ }
          setTimeout(function () { btn.classList.remove('is-copied'); }, 1200);
        });
      });

      h.appendChild(btn);
    });
  });
})();
