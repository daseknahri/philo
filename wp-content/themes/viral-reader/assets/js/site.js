/* Viral Reader — front-end JS (no dependencies). */
(function () {
	'use strict';

	var L = window.vrL10n || {};

	/* Polite live region for status messages (created once, reused). */
	var live;
	function announce(msg) {
		if (!live) {
			live = document.createElement('div');
			live.className = 'screen-reader-text';
			live.setAttribute('aria-live', 'polite');
			document.body.appendChild(live);
		}
		live.textContent = '';
		window.setTimeout(function () { live.textContent = msg; }, 30);
	}

	/* Mobile nav toggle. */
	var toggle = document.querySelector('.nav-toggle');
	var nav = document.getElementById('site-nav');
	if (toggle && nav) {
		toggle.addEventListener('click', function () {
			var open = document.body.classList.toggle('nav-open');
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
			/* Move focus into the menu on open. #site-nav is BEFORE .nav-toggle in the
			   DOM, so without this a keyboard / Switch Access / linear-swipe user would
			   tab PAST the just-revealed links; the Escape handler restores focus to the
			   toggle on close. Mirrors the search-reveal focus pattern below. */
			if (open) { var firstLink = nav.querySelector('a'); if (firstLink) { firstLink.focus(); } }
		});
		nav.addEventListener('click', function (e) {
			if (e.target.tagName === 'A') {
				document.body.classList.remove('nav-open');
				toggle.setAttribute('aria-expanded', 'false');
			}
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
				document.body.classList.remove('nav-open');
				toggle.setAttribute('aria-expanded', 'false');
				toggle.focus();
			}
		});
	}

	/* Header search reveal (progressive enhancement over the /?s= link). */
	var searchToggle = document.querySelector('[data-search-toggle]');
	var searchWrap = document.querySelector('.header-search');
	if (searchToggle && searchWrap) {
		var searchField = searchWrap.querySelector('input[type=search]');
		var closeSearch = function () {
			searchWrap.classList.remove('is-open');
			searchToggle.setAttribute('aria-expanded', 'false');
		};
		searchToggle.addEventListener('click', function (e) {
			e.preventDefault();
			var open = searchWrap.classList.toggle('is-open');
			searchToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
			if (open && searchField) { searchField.focus(); }
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && searchWrap.classList.contains('is-open')) {
				closeSearch();
				searchToggle.focus();
			}
		});
		document.addEventListener('click', function (e) {
			if (searchWrap.classList.contains('is-open') && !searchWrap.contains(e.target)) {
				closeSearch();
			}
		});
	}

	/* Reading progress (single posts) — compositor transform, no per-frame layout. */
	var bar = document.getElementById('vr-progress');
	var src = document.querySelector('[data-reading-progress-source]');
	if (bar && src) {
		var ticking = false;
		var update = function () {
			var rect = src.getBoundingClientRect();
			var total = rect.height - window.innerHeight;
			var scrolled = Math.min(Math.max(-rect.top, 0), total > 0 ? total : 1);
			var pct = total > 0 ? scrolled / total : 0;
			bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, pct)).toFixed(4) + ')';
			ticking = false;
		};
		var onScroll = function () { if (!ticking) { window.requestAnimationFrame(update); ticking = true; } };
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		update();
	}

	/* Copy-link + print buttons. */
	document.addEventListener('click', function (e) {
		var copyBtn = e.target.closest ? e.target.closest('[data-copy-url]') : null;
		if (copyBtn) {
			var url = copyBtn.getAttribute('data-copy-url');
			var done = function () {
				copyBtn.setAttribute('data-copied', L.copiedShort || 'Copied'); /* localized tooltip text */
				copyBtn.classList.add('is-copied');
				announce(L.copied || 'Link copied');
				setTimeout(function () { copyBtn.classList.remove('is-copied'); }, 1500);
			};
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(url).then(done, function () { window.prompt(L.copyPrompt || 'Copy this link:', url); });
			} else {
				window.prompt(L.copyPrompt || 'Copy this link:', url);
			}
			return;
		}
		var printBtn = e.target.closest ? e.target.closest('[data-print]') : null;
		if (printBtn) { window.print(); }
	});
})();
