(function () {
  "use strict";

  /* ─── Reduced-motion guard ─────────────────────────────── */
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IS_TOUCH = !window.matchMedia("(hover: hover)").matches;

  /* ─── GSAP setup ────────────────────────────────────────── */
  gsap.registerPlugin(ScrollTrigger);

  /* ─── Shared counter ──────────────────────────────────── */
  function countUp(el, target, dur) {
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: dur || 1.4,
      ease: "power2.out",
      onUpdate: function () { el.textContent = Math.round(obj.v); }
    });
  }

  /* ══════════════════════════════════════════════════════════
     HERO CANVAS — particle field
  ══════════════════════════════════════════════════════════ */
  (function initCanvas() {
    var canvas = document.getElementById("heroCanvas");
    if (!canvas || REDUCED) return;

    var ctx = canvas.getContext("2d");
    var W, H, particles = [];

    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Create particles
    var COUNT = Math.min(Math.floor(W * H / 14000), 80);
    for (var i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1
      });
    }

    var mouseX = W / 2, mouseY = H / 2;
    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    var RAF;
    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Draw connections
      for (var a = 0; a < particles.length; a++) {
        for (var b = a + 1; b < particles.length; b++) {
          var dx = particles[a].x - particles[b].x;
          var dy = particles[a].y - particles[b].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.strokeStyle = "rgba(91,142,255," + (0.06 * (1 - dist / 120)) + ")";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];

        // Subtle mouse repulsion
        var mdx = pt.x - mouseX;
        var mdy = pt.y - mouseY;
        var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 150) {
          pt.vx += mdx / mdist * 0.02;
          pt.vy += mdy / mdist * 0.02;
        }

        pt.vx *= 0.99;
        pt.vy *= 0.99;
        pt.x += pt.vx;
        pt.y += pt.vy;

        if (pt.x < 0) pt.x = W;
        if (pt.x > W) pt.x = 0;
        if (pt.y < 0) pt.y = H;
        if (pt.y > H) pt.y = 0;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(91,142,255," + pt.alpha + ")";
        ctx.fill();
      }

      RAF = requestAnimationFrame(draw);
    }

    // Only animate when hero is visible
    ScrollTrigger.create({
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      onEnter: function () { if (!RAF) RAF = requestAnimationFrame(draw); },
      onLeave: function () { cancelAnimationFrame(RAF); RAF = null; },
      onEnterBack: function () { if (!RAF) RAF = requestAnimationFrame(draw); },
      onLeaveBack: function () { cancelAnimationFrame(RAF); RAF = null; }
    });

    RAF = requestAnimationFrame(draw);
  })();

  /* ══════════════════════════════════════════════════════════
     CUSTOM CURSOR
  ══════════════════════════════════════════════════════════ */
  (function initCursor() {
    if (IS_TOUCH || REDUCED) return;

    var cursor  = document.getElementById("cursor");
    var dot     = cursor.querySelector(".cursor-dot");
    var ring    = cursor.querySelector(".cursor-ring");
    var label   = cursor.querySelector(".cursor-label");

    var mx = 0, my = 0;
    var dx = 0, dy = 0;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX;
      my = e.clientY;
    }, { passive: true });

    // Dot follows directly; ring lags behind (lerp via GSAP ticker)
    gsap.ticker.add(function () {
      // Dot: immediate
      gsap.set(dot, { x: mx, y: my });

      // Ring: lerped
      dx += (mx - dx) * 0.12;
      dy += (my - dy) * 0.12;
      gsap.set(ring, { x: dx, y: dy });
      gsap.set(label, { x: dx + 18, y: dy });
    });

    // Interactive elements
    function addHoverState(sel, type, text) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.addEventListener("mouseenter", function () {
          document.body.classList.add("cursor-hover");
          if (type === "link") {
            document.body.classList.add("cursor-link");
            label.textContent = text || "Ver";
          }
        });
        el.addEventListener("mouseleave", function () {
          document.body.classList.remove("cursor-hover", "cursor-link", "cursor-text");
          label.textContent = "";
        });
      });
    }

    addHoverState("a, button, .chip, .hobby-tag", "hover", "");
    addHoverState(".project-card", "link", "Ver →");
    addHoverState(".tl-card", "hover", "");
  })();

  /* ══════════════════════════════════════════════════════════
     HEADER — scroll state
  ══════════════════════════════════════════════════════════ */
  (function initHeader() {
    var header = document.getElementById("siteHeader");

    ScrollTrigger.create({
      start: "top -60",
      onUpdate: function (self) {
        header.classList.toggle("scrolled", self.progress > 0);
      }
    });

    // Mobile nav
    var toggle = document.getElementById("navToggle");
    var nav    = document.getElementById("siteNav");

    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    // Active nav on scroll
    var navLinks = nav.querySelectorAll("a[href^='#']");
    navLinks.forEach(function (link) {
      var target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      ScrollTrigger.create({
        trigger: target,
        start: "top 45%",
        end: "bottom 45%",
        onToggle: function (self) {
          if (!self.isActive) return;
          navLinks.forEach(function (l) { l.classList.remove("active"); });
          link.classList.add("active");
        }
      });
    });
  })();

  /* ══════════════════════════════════════════════════════════
     SMOOTH SCROLL (LENIS)
  ══════════════════════════════════════════════════════════ */
  var lenis = null;
  var isSmoothEnabled = true;

  function initSmoothScroll() {
    if (typeof Lenis === "undefined" || REDUCED) return;

    try {
      lenis = new Lenis({
        duration: 1.15,
        easing: function (t) {
          return Math.min(1, 1.001 - Math.pow(2, -10 * t));
        },
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
      });

      // Synchronize Lenis with GSAP ScrollTrigger
      lenis.on("scroll", ScrollTrigger.update);

      gsap.ticker.add(function (time) {
        if (lenis && isSmoothEnabled) {
          lenis.raf(time * 1000);
        }
      });

      gsap.ticker.lagSmoothing(0);
    } catch (err) {
      console.warn("Lenis init fallback:", err);
    }

    // Toggle button in header
    var toggleBtn = document.getElementById("smoothToggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        isSmoothEnabled = !isSmoothEnabled;
        var txt = toggleBtn.querySelector(".toggle-text");
        if (lenis) {
          if (isSmoothEnabled) {
            lenis.start();
            toggleBtn.classList.remove("is-off");
            if (txt) txt.textContent = "Smooth: ON";
          } else {
            lenis.stop();
            toggleBtn.classList.add("is-off");
            if (txt) txt.textContent = "Smooth: OFF";
          }
        }
      });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll("a[href^='#']").forEach(function (anchor) {
      anchor.addEventListener("click", function (e) {
        var href = anchor.getAttribute("href");
        if (!href || href === "#") return;
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          if (lenis && isSmoothEnabled) {
            lenis.scrollTo(target, { offset: -70, duration: 1.2 });
          } else {
            target.scrollIntoView({ behavior: "smooth" });
          }
        }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     DEVELOPER PRELOADER & 2-LAYER CURTAIN EXIT
  ══════════════════════════════════════════════════════════ */
  function initPreloader(onComplete) {
    var preloader  = document.getElementById("preloader");
    var fill       = document.getElementById("preloaderFill");
    var num        = document.getElementById("preloaderNum");
    var msg        = document.getElementById("preloaderMsg");
    var statusText = document.getElementById("preloaderStatusText");
    var content    = document.getElementById("preloaderContent");
    var layerFront = document.querySelector(".preloader-layer-front");
    var layerBg    = document.querySelector(".preloader-layer-bg");

    function finish() {
      document.body.classList.remove("is-loading");
      if (preloader) preloader.style.display = "none";
      ScrollTrigger.refresh();
      if (typeof onComplete === "function") onComplete();
    }

    if (!preloader) {
      finish();
      return;
    }

    if (REDUCED) {
      finish();
      return;
    }

    var progress = { val: 0 };
    var preTl = gsap.timeline();

    // Progress counter animation with live developer logs
    preTl.to(progress, {
      val: 100,
      duration: 1.6,
      ease: "power2.inOut",
      onUpdate: function () {
        var current = Math.round(progress.val);
        if (num) num.textContent = current;
        if (fill) fill.style.width = current + "%";

        if (current < 32) {
          if (msg) msg.textContent = "> booting runtime...";
          if (statusText) statusText.textContent = '"compiling_core"';
        } else if (current < 68) {
          if (msg) msg.textContent = "> loading assets & modules...";
          if (statusText) statusText.textContent = '"optimizing_vitals"';
        } else if (current < 92) {
          if (msg) msg.textContent = "> synchronizing animations...";
          if (statusText) statusText.textContent = '"ready_to_launch"';
        } else {
          if (msg) msg.textContent = "> 200 OK — compilation complete";
          if (statusText) statusText.textContent = '"ready"';
        }
      }
    });

    // Brief pause at 100% so user perceives completion
    preTl.to({}, { duration: 0.2 });

    // Step 1: Terminal card scales down and lifts out
    preTl.to(content, {
      y: -35,
      scale: 0.94,
      opacity: 0,
      duration: 0.45,
      ease: "power3.in"
    });

    // Step 2: Layer 1 (Front surface with glowing bottom edge) shoots up
    preTl.to(layerFront, {
      yPercent: -100,
      duration: 0.85,
      ease: "power4.inOut"
    }, "-=0.08");

    // Step 3: Layer 2 (Deep base layer) shoots up with trailing offset (two-layer curtain reveal!)
    preTl.to(layerBg, {
      yPercent: -100,
      duration: 0.95,
      ease: "power4.inOut"
    }, "-=0.72");

    // Step 4: Finish and trigger Hero sequence
    preTl.call(finish);
  }

  /* ══════════════════════════════════════════════════════════
     HERO ENTRANCE — GSAP timeline (triggered after preloader)
  ══════════════════════════════════════════════ */
  function setupHeroEntrance() {
    gsap.set(".hero-line", { yPercent: 110 });
    gsap.set(".code-editor-bar, .code-syntax-tag, .hero-tag, .hero-lead, .hero-actions, .hero-stats, .audit-panel, .scroll-indicator", {
      opacity: 0, y: 18
    });

    var tl = gsap.timeline({ paused: true, defaults: { ease: "power4.out" } });

    tl
      .to(".code-editor-bar", { opacity: 1, y: 0, duration: 0.6 })
      .to(".hero-tag", { opacity: 1, y: 0, duration: 0.5 }, "<0.1")
      .to(".code-syntax-tag", { opacity: 1, y: 0, duration: 0.5 }, "<0.1")
      .to(".hero-line", {
        yPercent: 0,
        duration: 0.9,
        stagger: 0.08
      }, "<0.1")
      .to(".hero-lead", { opacity: 1, y: 0, duration: 0.7 }, "<0.3")
      .to(".hero-actions", { opacity: 1, y: 0, duration: 0.6 }, "<0.15")
      .to(".hero-stats", { opacity: 1, y: 0, duration: 0.6 }, "<0.1")
      .to(".audit-panel", { opacity: 1, y: 0, duration: 0.8 }, "<-0.3")
      .to(".scroll-indicator", { opacity: 1, y: 0, duration: 0.5 }, "<0.2");

    return tl;
  }

  // Initialize Smooth Scroll and Preloader
  initSmoothScroll();
  var heroTimeline = setupHeroEntrance();

  initPreloader(function () {
    heroTimeline.play();
  });

  /* ══════════════════════════════════════════════════════════
     HERO STATS counter (on load)
  ══════════════════════════════════════════════════════════ */
  (function initHeroStats() {
    ScrollTrigger.create({
      trigger: ".hero-stats",
      start: "top 90%",
      once: true,
      onEnter: function () {
        document.querySelectorAll(".hero-stats .count").forEach(function (el) {
          var t = parseInt(el.dataset.target, 10);
          if (REDUCED) { el.textContent = t; return; }
          countUp(el, t, 1.5);
        });
      }
    });
  })();

  /* ══════════════════════════════════════════════════════════
     AUDIT GAUGES
  ══════════════════════════════════════════════════════════ */
  (function initGauges() {
    var CIRC = 326.73; // 2π × 52
    var gaugeButtons = document.querySelectorAll(".gauge");
    var auditNote    = document.getElementById("auditNote");
    var defaultNote  = auditNote ? auditNote.textContent : "";

    function colorFor(score) {
      var style = getComputedStyle(document.documentElement);
      if (score >= 90) return style.getPropertyValue("--good").trim();
      if (score >= 50) return style.getPropertyValue("--warn").trim();
      return style.getPropertyValue("--bad").trim();
    }

    function animateGauges() {
      gaugeButtons.forEach(function (btn, i) {
        var score = parseInt(btn.dataset.score, 10);
        var ring  = btn.querySelector(".gauge-value");
        var count = btn.querySelector(".count");
        ring.style.stroke = colorFor(score);
        var offset = CIRC * (1 - score / 100);

        if (REDUCED) {
          ring.style.strokeDashoffset = offset;
          count.textContent = score;
          return;
        }

        gsap.to(ring, {
          strokeDashoffset: offset,
          duration: 1.4,
          delay: 0.12 * i,
          ease: "power2.out"
        });
        countUp(count, score, 1.4);
      });
    }

    ScrollTrigger.create({
      trigger: ".audit-panel",
      start: "top 88%",
      once: true,
      onEnter: animateGauges
    });

    gaugeButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var isActive = btn.classList.contains("is-active");
        gaugeButtons.forEach(function (b) { b.classList.remove("is-active"); });
        if (isActive) { auditNote.textContent = defaultNote; return; }
        btn.classList.add("is-active");
        auditNote.textContent = btn.dataset.note;
      });
    });
  })();

  /* ══════════════════════════════════════════════════════════
     REVEAL BLOCKS — generic scroll reveal
  ══════════════════════════════════════════════════════════ */
  (function initRevealBlocks() {
    if (REDUCED) return;

    gsap.set(".reveal-block", { opacity: 0, y: 36 });

    ScrollTrigger.batch(".reveal-block", {
      start: "top 85%",
      once: true,
      onEnter: function (elements) {
        gsap.to(elements, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out"
        });
      }
    });
  })();

  /* ══════════════════════════════════════════════════════════
     ABOUT — fact counters & language bars
  ══════════════════════════════════════════════════════════ */
  (function initAbout() {
    // Fact counters
    ScrollTrigger.batch(".about-facts .count", {
      start: "top 88%",
      once: true,
      onEnter: function (elements) {
        elements.forEach(function (el) {
          var t = parseInt(el.dataset.target, 10);
          if (REDUCED) { el.textContent = t; return; }
          countUp(el, t, 1.3);
        });
      }
    });

    // Language bars
    ScrollTrigger.create({
      trigger: ".lang-bars",
      start: "top 85%",
      once: true,
      onEnter: function () {
        document.querySelectorAll(".lang-fill").forEach(function (fill) {
          var w = fill.dataset.width;
          if (REDUCED) {
            fill.style.transformOrigin = "left";
            fill.style.transform = "scaleX(" + w / 100 + ")";
            return;
          }
          gsap.to(fill, {
            scaleX: w / 100,
            duration: 1.2,
            ease: "power3.out",
            transformOrigin: "left"
          });
        });
      }
    });
  })();

  /* ══════════════════════════════════════════════════════════
     EXPERIENCE — drag-scroll with momentum
  ══════════════════════════════════════════════════════════ */
  (function initTimeline() {
    var track = document.getElementById("timelineTrack");
    if (!track) return;

    var isDown = false, startX, scrollLeft;

    track.addEventListener("mousedown", function (e) {
      isDown = true;
      track.style.userSelect = "none";
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });
    document.addEventListener("mouseup", function () {
      isDown = false;
      track.style.userSelect = "";
    });
    track.addEventListener("mousemove", function (e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - track.offsetLeft;
      var walk = (x - startX) * 1.8;
      track.scrollLeft = scrollLeft - walk;
    });

    // Reveal cards on scroll into view
    if (!REDUCED) {
      gsap.set(".tl-card", { opacity: 0, x: 40 });
      ScrollTrigger.batch(".tl-card", {
        start: "top 85%",
        once: true,
        onEnter: function (elements) {
          gsap.to(elements, {
            opacity: 1,
            x: 0,
            duration: 0.7,
            stagger: 0.1,
            ease: "power3.out"
          });
        }
      });
    }
  })();

  /* ══════════════════════════════════════════════════════════
     SKILLS — parallax depth on mouse move
  ══════════════════════════════════════════════════════════ */
  (function initSkills() {
    if (REDUCED || IS_TOUCH) return;

    var arena = document.getElementById("skillsArena");
    if (!arena) return;

    var chips = arena.querySelectorAll(".chip");

    arena.addEventListener("mousemove", function (e) {
      var rect = arena.getBoundingClientRect();
      var cx = (e.clientX - rect.left - rect.width  / 2) / rect.width;
      var cy = (e.clientY - rect.top  - rect.height / 2) / rect.height;

      chips.forEach(function (chip) {
        var depth = parseFloat(chip.dataset.depth) || 1;
        var tx = cx * depth * 12;
        var ty = cy * depth * 8;
        gsap.to(chip, {
          x: tx,
          y: ty,
          duration: 0.6,
          ease: "power2.out"
        });
      });
    });

    arena.addEventListener("mouseleave", function () {
      gsap.to(chips, {
        x: 0, y: 0,
        duration: 0.8,
        ease: "elastic.out(1, 0.4)"
      });
    });
  })();

  /* ══════════════════════════════════════════════════════════
     PROJECTS — drag scroll + progress bar
  ══════════════════════════════════════════════════════════ */
  (function initProjects() {
    var inner    = document.getElementById("projectsInner");
    var progress = document.getElementById("projectsProgressFill");
    if (!inner) return;

    // Update progress bar on scroll
    function updateProgress() {
      var max = inner.scrollWidth - inner.clientWidth;
      if (max <= 0) return;
      var pct = (inner.scrollLeft / max) * 100;
      if (progress) progress.style.width = pct + "%";
    }
    inner.addEventListener("scroll", updateProgress, { passive: true });

    // Drag scroll
    var isDown = false, startX, scrollLeft;

    inner.addEventListener("mousedown", function (e) {
      isDown = true;
      inner.style.userSelect = "none";
      startX = e.pageX - inner.offsetLeft;
      scrollLeft = inner.scrollLeft;
    });
    document.addEventListener("mouseup", function () {
      isDown = false;
      inner.style.userSelect = "";
    });
    inner.addEventListener("mousemove", function (e) {
      if (!isDown) return;
      e.preventDefault();
      var x    = e.pageX - inner.offsetLeft;
      var walk = (x - startX) * 2;
      inner.scrollLeft = scrollLeft - walk;
    });

    // Reveal cards
    if (!REDUCED) {
      gsap.set(".project-card", { opacity: 0, y: 30 });
      ScrollTrigger.batch(".project-card", {
        start: "top 92%",
        once: true,
        onEnter: function (elements) {
          gsap.to(elements, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: "power3.out"
          });
        }
      });
    }
  })();

  /* ══════════════════════════════════════════════════════════
     ANIMATE TEXT ON SCROLL (GSAP ScrollTrigger)
  ══════════════════════════════════════════════════════════ */
  (function initTextAnimations() {
    if (REDUCED) return;

    // 1. Scrubbed Word-by-Word Reveal for About Lead
    var lead = document.querySelector(".about-lead");
    if (lead) {
      var rawText = lead.textContent.trim();
      var words = rawText.split(/\s+/);
      lead.innerHTML = words.map(function (w) {
        return '<span class="scrub-word">' + w + '</span>';
      }).join(" ");

      var scrubWords = lead.querySelectorAll(".scrub-word");
      gsap.fromTo(scrubWords,
        { opacity: 0.18, color: "#4A5368" },
        {
          opacity: 1,
          color: "#EEF1F8",
          stagger: 0.05,
          ease: "none",
          scrollTrigger: {
            trigger: lead,
            start: "top 82%",
            end: "bottom 55%",
            scrub: 0.8
          }
        }
      );
    }

    // 2. Split-mask Word Reveal for Key Headings
    var targetHeadings = document.querySelectorAll(".section-head h2, .contact-title");
    targetHeadings.forEach(function (h2) {
      var nodes = Array.from(h2.childNodes);
      var newHtml = "";

      nodes.forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          var parts = node.textContent.split(/(\s+)/);
          parts.forEach(function (part) {
            if (/^\s+$/.test(part)) {
              newHtml += " ";
            } else if (part.length > 0) {
              newHtml += '<span class="split-mask"><span class="split-word">' + part + '</span></span>';
            }
          });
        } else if (node.nodeName === "BR") {
          newHtml += "<br>";
        } else if (node.nodeName === "EM") {
          var emParts = node.textContent.split(/(\s+)/);
          emParts.forEach(function (part) {
            if (/^\s+$/.test(part)) {
              newHtml += " ";
            } else if (part.length > 0) {
              newHtml += '<span class="split-mask"><em class="split-word">' + part + '</em></span>';
            }
          });
        } else {
          newHtml += node.outerHTML;
        }
      });

      h2.innerHTML = newHtml;

      var splitWords = h2.querySelectorAll(".split-word");
      gsap.from(splitWords, {
        yPercent: 120,
        rotateZ: 2,
        opacity: 0,
        duration: 0.85,
        stagger: 0.05,
        ease: "power4.out",
        scrollTrigger: {
          trigger: h2,
          start: "top 85%",
          once: true
        }
      });
    });

    // 3. Section Eyebrow Subtle Line Entrance
    gsap.utils.toArray(".section-eyebrow").forEach(function (el) {
      gsap.from(el, {
        opacity: 0,
        x: -20,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          once: true
        }
      });
    });
  })();

  /* ══════════════════════════════════════════════════════════
     FOOTER year
  ══════════════════════════════════════════════════════════ */
  var fy = document.getElementById("footerYear");
  if (fy) fy.textContent = new Date().getFullYear();

})();
