/* ===========================================================================
   Rare Cobranças — page behaviour

   Depends on the globals loaded before this file: gsap, ScrollTrigger,
   CustomEase, Lenis.

   Everything here degrades to a static, fully readable page: the CSS keeps
   content visible unless `js-ready` is set, and every motion block bails out
   under prefers-reduced-motion.
   =========================================================================== */

(function () {
  'use strict';

  gsap.registerPlugin(ScrollTrigger, CustomEase);

  /* The same curves declared in tokens.css, so CSS and GSAP move identically. */
  var EASE_APPLE = CustomEase.create('apple', '0.28,0.11,0.32,1');
  var EASE_OUT_SOFT = CustomEase.create('outSoft', '0.16,1,0.3,1');

  var REVEAL_DURATION = 0.9;
  var REVEAL_STAGGER = 0.09;
  var REVEAL_START = 'top 75%'; // element top at 75% of the viewport height

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* -------------------------------------------------------------------------
     Smooth scrolling
     Lenis is driven by GSAP's ticker so both read the same frame.
  ------------------------------------------------------------------------- */

  var lenis = null;

  function initSmoothScroll() {
    if (prefersReducedMotion()) return;

    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  /* Anchor links have to go through Lenis or they fight the smoothing. */
  function initAnchors() {
    document.addEventListener('click', function (event) {
      var anchor = event.target.closest && event.target.closest('a[href^="#"]');
      if (!anchor) return;

      var href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      var target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      closeMenu();

      if (lenis) {
        lenis.scrollTo(target, { offset: -72 });
      } else {
        target.scrollIntoView();
      }
    });
  }

  /* -------------------------------------------------------------------------
     Reveals

     Two kinds of target inside a [data-reveal-section], animated in document
     order by one staggered timeline:
       .mask-line    — heading line riding up from behind a clip
       [data-reveal] — anything else: fade up 32px
  ------------------------------------------------------------------------- */

  function buildReveal(section, options) {
    var opts = options || {};
    var stagger = parseFloat(section.dataset.stagger) || REVEAL_STAGGER;
    var delay = parseFloat(section.dataset.delay) || 0;
    var immediate = section.hasAttribute('data-reveal-immediate');

    var targets = section.querySelectorAll('.mask-line, [data-reveal]');
    if (!targets.length) return null;

    var config = {
      delay: delay,
      defaults: { duration: REVEAL_DURATION, ease: EASE_APPLE },
    };

    if (immediate) {
      // Held until the preloader releases it.
      config.paused = true;
    } else {
      config.scrollTrigger = { trigger: section, start: REVEAL_START, once: true };
    }

    var tl = gsap.timeline(config);

    Array.prototype.forEach.call(targets, function (el, index) {
      var at = index * stagger;

      if (el.classList.contains('mask-line')) {
        var line = el.firstElementChild;
        if (!line) return;
        // `y: 0` is not redundant. The resting state comes from a CSS
        // translateY(105%), which GSAP reads back as a pixel `y` offset;
        // without pinning `y`, that parsed offset survives and fights the
        // yPercent tween, leaving the line parked out of view.
        tl.fromTo(line, { yPercent: 105, y: 0 }, { yPercent: 0, y: 0, duration: 1 }, at);
        return;
      }

      tl.fromTo(el, { opacity: 0, y: 32 }, { opacity: 1, y: 0 }, at);
    });

    if (opts.onBuilt) opts.onBuilt(tl);
    return tl;
  }

  var heroTimeline = null;

  function initReveals() {
    if (prefersReducedMotion()) return;

    var sections = document.querySelectorAll('[data-reveal-section]');
    Array.prototype.forEach.call(sections, function (section) {
      var tl = buildReveal(section);
      if (tl && section.hasAttribute('data-reveal-immediate')) heroTimeline = tl;
    });
  }

  function releaseHero() {
    if (heroTimeline) heroTimeline.play();
  }

  /* -------------------------------------------------------------------------
     Preloader

     The bar reports on real image loading, floored by a minimum display time
     so a warm cache does not produce a flash.
  ------------------------------------------------------------------------- */

  var MIN_VISIBLE_MS = 900;

  function initPreloader() {
    var panel = document.getElementById('preloader');
    if (!panel) {
      releaseHero();
      return;
    }

    var logo = document.getElementById('preloader-logo');
    var path = document.getElementById('preloader-path');
    var bar = document.getElementById('preloader-bar');
    var reduced = prefersReducedMotion();

    document.body.dataset.locked = 'true';

    var released = false;
    function release() {
      if (released) return;
      released = true;
      document.body.removeAttribute('data-locked');
      releaseHero();
      ScrollTrigger.refresh();
    }

    /* Real assets, not a fake timer. */
    var assets = [
      'src/img/portrait-problem-640.webp',
      'src/img/portrait-turn-520.webp',
    ];
    var loaded = 0;
    var started = performance.now();

    assets.forEach(function (src) {
      var img = new Image();
      // A missing asset must never trap the visitor.
      img.onload = img.onerror = function () {
        loaded += 1;
      };
      img.src = src;
    });

    /* Draw the outline of the R, then fill it. */
    if (!reduced && path) {
      var length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, fillOpacity: 0 });
      gsap
        .timeline()
        .to(path, { strokeDashoffset: 0, duration: 1.2, ease: EASE_APPLE })
        .to(path, { fillOpacity: 1, duration: 0.3, ease: 'none' });
    }

    function exit() {
      if (reduced) {
        gsap.to(panel, {
          autoAlpha: 0,
          duration: 0.3,
          onStart: release,
          onComplete: function () {
            panel.remove();
          },
        });
        return;
      }

      gsap
        .timeline({
          onComplete: function () {
            panel.remove();
          },
        })
        .to(logo, { opacity: 0, y: -20, duration: 0.4, ease: EASE_APPLE })
        .to(panel, { yPercent: -100, duration: 0.9, ease: EASE_APPLE })
        // The hero starts 0.7s into the 0.9s panel exit — a 200ms overlap.
        .call(release, null, '-=0.2');
    }

    (function tick() {
      var elapsed = performance.now() - started;
      // The bar can outrun neither the real loading nor the minimum display
      // time, so it always reads as a genuine, smooth advance.
      var progress = Math.min(loaded / assets.length, elapsed / MIN_VISIBLE_MS, 1);

      if (bar) bar.style.transform = 'scaleX(' + progress + ')';

      if (progress >= 1) {
        exit();
        return;
      }
      requestAnimationFrame(tick);
    })();
  }

  /* -------------------------------------------------------------------------
     Header — frosts over on scroll, hides on the way down, returns on the way up
  ------------------------------------------------------------------------- */

  var CONDENSE_AT = 80;
  var HIDE_AFTER = 400;

  function initHeader() {
    var header = document.getElementById('header');
    if (!header) return;

    var last = window.scrollY;
    var hidden = false;

    window.addEventListener(
      'scroll',
      function () {
        var y = window.scrollY;

        header.classList.toggle('is-condensed', y > CONDENSE_AT);

        // Never slide the bar away while the mobile menu is open.
        var menuOpen = document.body.dataset.locked === 'true';
        var shouldHide = !menuOpen && y > HIDE_AFTER && y > last;
        var shouldShow = y < last || y <= HIDE_AFTER;

        if (shouldHide && !hidden) {
          hidden = true;
          gsap.to(header, { yPercent: -100, duration: 0.32, ease: EASE_APPLE });
        } else if (shouldShow && hidden) {
          hidden = false;
          gsap.to(header, { yPercent: 0, duration: 0.32, ease: EASE_APPLE });
        }

        last = y;
      },
      { passive: true },
    );
  }

  /* -------------------------------------------------------------------------
     Mobile menu
  ------------------------------------------------------------------------- */

  var menu = null;

  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    document.body.removeAttribute('data-locked');
    var toggle = document.getElementById('menu-open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  }

  function initMenu() {
    menu = document.getElementById('menu');
    var openBtn = document.getElementById('menu-open');
    var closeBtn = document.getElementById('menu-close');
    if (!menu || !openBtn) return;

    openBtn.addEventListener('click', function () {
      menu.hidden = false;
      document.body.dataset.locked = 'true';
      openBtn.setAttribute('aria-expanded', 'true');
      if (closeBtn) closeBtn.focus();

      if (!prefersReducedMotion()) {
        gsap.from(menu.querySelectorAll('[data-menu-item]'), {
          opacity: 0,
          y: 28,
          duration: 0.6,
          stagger: 0.07,
          ease: EASE_APPLE,
        });
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    // Any link closes the panel — including the WhatsApp CTAs, which open in a
    // new tab and would otherwise leave the menu sitting open behind them.
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* -------------------------------------------------------------------------
     2 — Problem image: settles from a slight over-scale, then drifts
  ------------------------------------------------------------------------- */

  function initProblemImage() {
    if (prefersReducedMotion()) return;

    var frame = document.getElementById('problem-media');
    var img = document.getElementById('problem-image');
    if (!frame || !img) return;

    gsap.fromTo(
      img,
      { scale: 1.08, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 1.2,
        ease: EASE_APPLE,
        scrollTrigger: { trigger: frame, start: 'top 85%', once: true },
      },
    );

    // Under 8% of the image height — felt, not seen.
    gsap.to(img, {
      yPercent: 6,
      ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  /* -------------------------------------------------------------------------
     3 — Turn image parallax
  ------------------------------------------------------------------------- */

  function initTurnImage() {
    if (prefersReducedMotion()) return;

    var frame = document.getElementById('turn-media');
    var img = document.getElementById('turn-image');
    if (!frame || !img) return;

    gsap.fromTo(
      img,
      { yPercent: -4 },
      {
        yPercent: 4,
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  }

  /* -------------------------------------------------------------------------
     4 — Método: the pinned four-step sequence

     The section holds the screen while the visitor walks the four steps, then
     releases. 400% of the viewport gives each step a full screen-height of
     scroll — enough to read it before it changes. Lower this and the sequence
     starts to feel rushed.
  ------------------------------------------------------------------------- */

  var PIN_DISTANCE = '+=400%';

  function initMethod() {
    var section = document.getElementById('metodo');
    var list = document.getElementById('method-steps');
    var progress = document.getElementById('method-progress');
    var counter = document.getElementById('method-counter');
    if (!section || !list) return;

    var panels = list.querySelectorAll('.method__panel');
    var numbers = counter ? counter.querySelectorAll('span') : [];
    if (!panels.length) return;

    var mm = gsap.matchMedia();

    /* --- Desktop: pin, and drive the steps from scroll progress ----------- */
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
      // Only the first step is on screen to begin with.
      gsap.set(panels, { autoAlpha: 0, y: 24 });
      gsap.set(panels[0], { autoAlpha: 1, y: 0 });

      var current = 0;
      var swap = null;

      function goTo(next) {
        if (next === current) return;

        var from = panels[current];
        var to = panels[next];
        var direction = next > current ? 1 : -1;
        current = next;

        if (swap) swap.kill();
        // Sequential, not overlapping: the outgoing step is gone before the
        // incoming one arrives, so two steps are never legible at once.
        swap = gsap
          .timeline()
          .to(from, { autoAlpha: 0, y: -24 * direction, duration: 0.22, ease: EASE_APPLE })
          .fromTo(
            to,
            { autoAlpha: 0, y: 24 * direction },
            { autoAlpha: 1, y: 0, duration: 0.5, ease: EASE_APPLE },
          );

        Array.prototype.forEach.call(numbers, function (n, i) {
          gsap.to(n, {
            color: i === next ? '#ffffff' : 'var(--text-eyebrow)',
            duration: 0.3,
            ease: EASE_APPLE,
          });
        });
      }

      var trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: PIN_DISTANCE,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        // No `once` — scrolling back up walks the sequence in reverse.
        onUpdate: function (self) {
          // The bar is the only cue for how much is left, so it tracks raw
          // progress continuously rather than stepping per panel.
          if (progress) progress.style.transform = 'scaleX(' + self.progress + ')';
          goTo(Math.min(panels.length - 1, Math.floor(self.progress * panels.length)));
        },
      });

      return function cleanup() {
        trigger.kill();
        if (swap) swap.kill();
        gsap.set(panels, { clearProps: 'all' });
      };
    });

    /* --- Stacked (mobile): each step reveals on its own ------------------- */
    mm.add('(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)', function () {
      var tweens = [];
      Array.prototype.forEach.call(panels, function (panel) {
        tweens.push(
          gsap.fromTo(
            panel,
            { opacity: 0, y: 32 },
            {
              opacity: 1,
              y: 0,
              duration: REVEAL_DURATION,
              ease: EASE_OUT_SOFT,
              scrollTrigger: { trigger: panel, start: REVEAL_START, once: true },
            },
          ),
        );
      });

      return function cleanup() {
        tweens.forEach(function (t) {
          if (t.scrollTrigger) t.scrollTrigger.kill();
          t.kill();
        });
        gsap.set(panels, { clearProps: 'all' });
      };
    });
  }

  /* -------------------------------------------------------------------------
     6 — FAQ accordion. One panel open at a time.
  ------------------------------------------------------------------------- */

  function initFaq() {
    var root = document.getElementById('faq');
    if (!root) return;

    var buttons = root.querySelectorAll('.faq__q');

    function panelFor(button) {
      return document.getElementById(button.getAttribute('aria-controls'));
    }

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function () {
        var willOpen = button.getAttribute('aria-expanded') !== 'true';

        // Only one panel is ever open.
        Array.prototype.forEach.call(buttons, function (other) {
          other.setAttribute('aria-expanded', 'false');
          var panel = panelFor(other);
          if (panel) panel.classList.remove('is-open');
        });

        if (willOpen) {
          button.setAttribute('aria-expanded', 'true');
          var panel = panelFor(button);
          if (panel) panel.classList.add('is-open');
        }

        // The panel height animates in CSS (0fr -> 1fr), so once it has
        // settled the pinned section above needs remeasuring.
        setTimeout(ScrollTrigger.refresh, 420);
      });
    });
  }

  /* -------------------------------------------------------------------------
     7 — CTA panel resolves from a squashed, rounded card into a full band
  ------------------------------------------------------------------------- */

  function initCtaPanel() {
    if (prefersReducedMotion()) return;

    var panel = document.getElementById('cta-panel');
    if (!panel) return;

    gsap.fromTo(
      panel,
      { scaleY: 0.92, borderRadius: '48px' },
      {
        scaleY: 1,
        borderRadius: '0px',
        duration: 0.9,
        ease: EASE_APPLE,
        scrollTrigger: { trigger: panel, start: 'top 85%', once: true },
      },
    );
  }

  /* -------------------------------------------------------------------------
     8 — Footer tagline: a light band sweeps across as the footer enters
  ------------------------------------------------------------------------- */

  function initFooterTagline() {
    if (prefersReducedMotion()) return;

    var tagline = document.getElementById('footer-tagline');
    if (!tagline) return;

    gsap.fromTo(
      tagline,
      { backgroundPosition: '100% 0%' },
      {
        backgroundPosition: '0% 0%',
        ease: 'none',
        scrollTrigger: { trigger: tagline, start: 'top 95%', end: 'bottom 55%', scrub: true },
      },
    );
  }

  /* -------------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------------- */

  initSmoothScroll();
  initAnchors();
  initReveals();
  initHeader();
  initMenu();
  initProblemImage();
  initTurnImage();
  initMethod();
  initFaq();
  initCtaPanel();
  initFooterTagline();
  initPreloader();

  // Web fonts change every measurement on the page, and the pinned Método
  // section depends on those measurements being right.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      ScrollTrigger.refresh();
    });
  }
})();
