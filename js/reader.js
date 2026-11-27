/* Buletin JKEES 2026: the page reader.
   Opens over the page from any link to #ms-N (N = 1..55). Phone: one page at a time, swipe, pinch or double-tap
   to zoom. Computer (wide screens): two-page spreads (1, 2–3, 4–5 … 54–55), arrow keys, click to zoom.
   Wide screens can switch to one page at a time, fitted to the width and scrolled (remembered in this browser);
   there it zooms by widening the page. Both views on wide screens: click, the − 100% + buttons, the − / + / 0 keys
   or a trackpad pinch to zoom, and drag to move around a zoomed page.
   Loads only the pages on screen and the next/previous ones. */
(function () {
  var B = window.BULETIN;
  var R = document.getElementById('reader');
  if (!B || !R) return;
  var N = B.pages, RATIO = 1600 / 2263, ZOOM = 1.5, ZMAX = 3, FITMAX = 960, FITZ = [1, 1.25, 1.5, 1.75, 2];
  var stage = R.querySelector('.rd-stage');
  var view = R.querySelector('.rd-view');
  var count = R.querySelector('.rd-count');
  var title = R.querySelector('.rd-title');
  var prevBtns = R.querySelectorAll('[data-prev]');
  var nextBtns = R.querySelectorAll('[data-next]');
  var viewBtn = R.querySelector('[data-view]');
  var zoomBox = R.querySelector('.rd-zoom');
  var zoomPct = R.querySelector('.rd-zpct');
  var page = 1, spread = false, isOpen = false, scrollBack = 0, focusBack = null;
  var single = false; // the reader's choice of one page at a time on wide screens
  try { single = localStorage.getItem('buletin-view') === '1'; } catch (err) {}
  var zoom = { s: 1, x: 0, y: 0 };

  function wide() { return window.innerWidth >= 900 && window.innerWidth > window.innerHeight * 1.1; }
  function useSpread() { return wide() && !single; }
  // one page on a wide screen: fit the page to the width and scroll down it; zoom widens the page
  function useFit() { return wide() && single; }
  var fit = false, fz = 1; // fz: zoom of the fitted page (1 = fitted to the width)
  function setViewBtn() {
    viewBtn.hidden = !wide();
    viewBtn.textContent = single ? 'Paparan 2 halaman' : 'Paparan 1 halaman';
    zoomBox.hidden = !wide(); // computers: both views (phones pinch)
  }
  function pagesFor(p) {
    if (!spread || p === 1) return [p];
    var left = p % 2 === 0 ? p : p - 1;
    return left + 1 <= N ? [left, left + 1] : [left];
  }
  function clamp(p) { return Math.max(1, Math.min(N, p)); }
  function label(n) { return 'Halaman ' + n + ': ' + B.titles[n]; }

  function setZoom(s, x, y) {
    var w = stage.clientWidth, h = stage.clientHeight;
    s = Math.max(1, Math.min(ZMAX, s));
    var mx = (w * (s - 1)) / 2, my = (h * (s - 1)) / 2;
    zoom.s = s;
    zoom.x = s === 1 ? 0 : Math.max(-mx, Math.min(mx, x));
    zoom.y = s === 1 ? 0 : Math.max(-my, Math.min(my, y));
    view.style.transform = 'translate(' + zoom.x + 'px,' + zoom.y + 'px) scale(' + zoom.s + ')';
    R.classList.toggle('zoomed', s > 1);
    showFz();
    if (s > 1) {
      // sharper image while zoomed
      Array.prototype.forEach.call(view.querySelectorAll('img'), function (im) {
        var big = B.img(+im.getAttribute('data-n'), 1600);
        if (im.getAttribute('src') !== big) { im.removeAttribute('srcset'); im.src = big; }
      });
    }
  }
  // zoom to scale s keeping the point (cx, cy) (relative to the stage centre) still
  function zoomAt(s, cx, cy) {
    var k = s / zoom.s;
    setZoom(s, cx - (cx - zoom.x) * k, cy - (cy - zoom.y) * k);
  }

  function layout() {
    var w = stage.clientWidth, h = stage.clientHeight, imgs = view.querySelectorAll('img');
    var pw = fit ? Math.min(w - 160, FITMAX) * fz : Math.min(h * RATIO, w / imgs.length);
    Array.prototype.forEach.call(imgs, function (im) {
      if (fit) im.sizes = Math.ceil(pw) + 'px';
      im.style.width = Math.floor(pw) + 'px';
      im.style.height = Math.floor(pw / RATIO) + 'px';
    });
  }

  // fitted page: zoom to fz keeping the point (cx, cy) of the view (px from its top-left) still
  // one-page view: zoom out as far as the whole page fitting the screen height
  function minFz() {
    var base = Math.min(stage.clientWidth - 160, FITMAX);
    var whole = Math.max(100, view.clientHeight - 64) * RATIO; // page width at which its full height fits
    return Math.min(1, whole / base);
  }
  function fitSteps() {
    var m = minFz(), s = [m];
    if (0.75 > m + 0.05) s.push(0.75);
    return s.concat(FITZ.filter(function (v) { return v > m + 0.001; }));
  }
  function showFz() { // the − 100% + control shows the zoom of whichever view is on
    var z = fit ? fz : zoom.s;
    zoomPct.textContent = Math.round(z * 100) + '%';
    R.querySelector('[data-zout]').disabled = z <= (fit ? minFz() : FITZ[0]) + 0.001;
    R.querySelector('[data-zin]').disabled = z >= FITZ[FITZ.length - 1] - 0.001;
    R.classList.toggle('fz', fit && fz > 1);
  }
  function fitZoom(z, cx, cy) {
    z = Math.max(minFz(), Math.min(FITZ[FITZ.length - 1], z));
    if (!fit || Math.abs(z - fz) < 0.001) return;
    var im = view.querySelector('img');
    if (cx == null) { cx = view.clientWidth / 2; cy = view.clientHeight / 2; }
    var off0 = im.offsetLeft, top0 = im.offsetTop;
    var px = view.scrollLeft + cx - off0, py = view.scrollTop + cy - top0, k = z / fz;
    fz = z;
    layout();
    view.scrollLeft = px * k + im.offsetLeft - cx;
    view.scrollTop = py * k + im.offsetTop - cy;
    showFz();
  }
  function zoomStep(dir) {
    if (fit) { fitStep(dir); return; }
    var z = zoom.s, t = dir > 0
      ? FITZ.filter(function (v) { return v > z + 0.01; })[0]
      : FITZ.filter(function (v) { return v < z - 0.01; }).pop();
    if (t == null) return;
    if (t === 1) setZoom(1, 0, 0); else zoomAt(t, 0, 0);
  }
  function fitStep(dir) {
    var st = fitSteps(), t = dir > 0
      ? st.filter(function (v) { return v > fz + 0.01; })[0]
      : st.filter(function (v) { return v < fz - 0.01; }).pop();
    if (t != null) fitZoom(t);
  }

  function preload(p) {
    pagesFor(p).forEach(function (n) {
      var im = new Image();
      im.sizes = fit ? FITMAX + 'px' : spread ? '50vw' : '100vw';
      im.srcset = B.img(n, 800) + ' 800w, ' + B.img(n, 1600) + ' 1600w';
      im.src = B.img(n, 800);
    });
  }

  function render() {
    spread = useSpread();
    fit = useFit();
    R.classList.toggle('fit', fit);
    setViewBtn();
    var ps = pagesFor(page);
    page = ps[0];
    view.innerHTML = '';
    ps.forEach(function (n) {
      var im = document.createElement('img');
      im.className = 'rd-page';
      im.setAttribute('data-n', n);
      im.alt = label(n);
      im.decoding = 'async';
      im.sizes = fit ? FITMAX + 'px' : ps.length > 1 ? '50vw' : '100vw';
      im.srcset = B.img(n, 800) + ' 800w, ' + B.img(n, 1600) + ' 1600w';
      im.src = B.img(n, 800);
      view.appendChild(im);
    });
    setZoom(1, 0, 0);
    if (fit) view.style.transform = '';
    layout();
    view.scrollTop = 0;
    view.scrollLeft = (view.scrollWidth - view.clientWidth) / 2;
    showFz();
    var last = ps[ps.length - 1];
    count.textContent = (ps.length > 1 ? ps[0] + '–' + last : ps[0]) + ' / ' + N;
    title.textContent = ps.map(function (n) { return B.titles[n]; })
      .filter(function (t, i, a) { return a.indexOf(t) === i; }).join(' · ');
    Array.prototype.forEach.call(prevBtns, function (b) { b.disabled = ps[0] === 1; });
    Array.prototype.forEach.call(nextBtns, function (b) { b.disabled = last === N; });
    if (last < N) preload(last + 1);
    if (ps[0] > 1) preload(ps[0] - 1);
    if (history.replaceState) history.replaceState(null, '', '#ms-' + ps[0]);
  }

  function go(p) { page = clamp(p); render(); }
  function next() { var ps = pagesFor(page); if (ps[ps.length - 1] < N) go(ps[ps.length - 1] + 1); }
  function prev() { var ps = pagesFor(page); if (ps[0] > 1) go(pagesFor(ps[0] - 1)[0]); }

  function open(p) {
    if (!isOpen) {
      scrollBack = window.pageYOffset;
      focusBack = document.activeElement;
      R.hidden = false;
      document.documentElement.classList.add('rd-on');
      isOpen = true;
      R.querySelector('[data-close]').focus();
    }
    go(p);
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    R.hidden = true;
    view.innerHTML = '';
    document.documentElement.classList.remove('rd-on');
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, scrollBack);
    if (focusBack && focusBack.focus) focusBack.focus();
  }

  R.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) close();
    else if (e.target.closest('[data-view]')) {
      single = !single;
      try { localStorage.setItem('buletin-view', single ? '1' : '0'); } catch (err) {}
      go(page);
    }
    else if (e.target.closest('[data-prev]')) prev();
    else if (e.target.closest('[data-next]')) next();
    else if (e.target.closest('[data-zin]')) zoomStep(1);
    else if (e.target.closest('[data-zout]')) zoomStep(-1);
  });

  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    var k = e.key;
    if (k === 'Escape') {
      e.preventDefault();
      if (fit && Math.abs(fz - 1) > 0.001) fitZoom(1); else if (zoom.s > 1) setZoom(1, 0, 0); else close();
      return;
    }
    if (k === 'Tab') { // keep focus inside the reader
      var f = Array.prototype.filter.call(R.querySelectorAll('button, a[href]'), function (el) {
        return !el.disabled && el.offsetParent !== null;
      });
      if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      return;
    }
    if (k === '+' || k === '=') { e.preventDefault(); zoomStep(1); return; }
    if (k === '-' || k === '_') { e.preventDefault(); zoomStep(-1); return; }
    if (k === '0') { e.preventDefault(); if (fit) fitZoom(1); else setZoom(1, 0, 0); return; }
    if (fit && (k === 'ArrowDown' || k === 'ArrowUp' || k === 'PageDown' || k === 'PageUp' || k === ' ')) {
      e.preventDefault(); // scroll down/up the page
      var step = (k === 'ArrowDown' || k === 'ArrowUp') ? 80 : view.clientHeight * 0.85;
      view.scrollBy({ top: (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) ? -step : step, behavior: 'smooth' });
      return;
    }
    if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); go(1); }
    else if (k === 'End') { e.preventDefault(); go(N); }
  });

  // touch and mouse: swipe, drag to pan, pinch, double-tap or click to zoom
  var pts = {}, start = null, pinch = null, lastTap = 0, moved = false, fdrag = null;
  function centre(e) {
    var r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  }
  stage.addEventListener('pointerdown', function (e) {
    if (e.button && e.button !== 0) return;
    if (e.target.closest('button, a')) return; // the side arrows are inside the stage
    if (fit) {
      if (e.pointerType !== 'mouse') return; // touch: the browser's own scrolling
      fdrag = { x: e.clientX, y: e.clientY, sl: view.scrollLeft, st: view.scrollTop, moved: false };
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    var ids = Object.keys(pts);
    if (ids.length === 1) {
      start = { x: e.clientX, y: e.clientY, zx: zoom.x, zy: zoom.y, t: Date.now() };
      moved = false;
    } else if (ids.length === 2) {
      var a = pts[ids[0]], b = pts[ids[1]];
      var r = stage.getBoundingClientRect();
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: zoom.s,
        cx: (a.x + b.x) / 2 - r.left - r.width / 2, cy: (a.y + b.y) / 2 - r.top - r.height / 2 };
      moved = true;
    }
  });
  stage.addEventListener('pointermove', function (e) {
    if (fdrag) {
      var ddx = e.clientX - fdrag.x, ddy = e.clientY - fdrag.y;
      if (Math.abs(ddx) > 4 || Math.abs(ddy) > 4) { fdrag.moved = true; R.classList.add('drag'); }
      if (fdrag.moved) { view.scrollLeft = fdrag.sl - ddx; view.scrollTop = fdrag.st - ddy; }
      return;
    }
    if (!pts[e.pointerId]) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pts);
    if (ids.length === 2 && pinch) {
      var a = pts[ids[0]], b = pts[ids[1]];
      zoomAt(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, pinch.cx, pinch.cy);
      return;
    }
    if (!start) return;
    var dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
    if (zoom.s > 1) setZoom(zoom.s, start.zx + dx, start.zy + dy);
    else view.style.transform = 'translateX(' + dx * 0.35 + 'px)';
  });
  function up(e) {
    if (fdrag) {
      var d = fdrag;
      fdrag = null;
      R.classList.remove('drag');
      if (!d.moved && e.type === 'pointerup') {
        var vr = view.getBoundingClientRect();
        fitZoom(Math.abs(fz - 1) > 0.001 ? 1 : 1.5, e.clientX - vr.left, e.clientY - vr.top);
      }
      return;
    }
    if (!pts[e.pointerId]) return;
    delete pts[e.pointerId];
    var left = Object.keys(pts).length;
    if (pinch) {
      if (left === 0) { pinch = null; start = null; if (zoom.s < 1.05) setZoom(1, 0, 0); }
      return;
    }
    if (!start) return;
    var dx = e.clientX - start.x, dy = e.clientY - start.y, s = start;
    start = null;
    if (zoom.s === 1) view.style.transform = '';
    if (!moved) {
      var now = Date.now(), c = centre(e);
      if (e.pointerType === 'mouse') { if (zoom.s > 1) setZoom(1, 0, 0); else zoomAt(ZOOM, c.x, c.y); }
      else if (now - lastTap < 320) { lastTap = 0; if (zoom.s > 1) setZoom(1, 0, 0); else zoomAt(ZOOM, c.x, c.y); }
      else lastTap = now;
      return;
    }
    if (zoom.s === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && Date.now() - s.t < 900) {
      if (dx < 0) next(); else prev();
    }
  }
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', function (e) {
    if (!e.ctrlKey) return; // trackpad pinch
    e.preventDefault();
    if (fit) {
      var vr = view.getBoundingClientRect();
      fitZoom(fz * Math.exp(-e.deltaY / 200), e.clientX - vr.left, e.clientY - vr.top);
      return;
    }
    var c = centre(e);
    zoomAt(zoom.s * Math.exp(-e.deltaY / 200), c.x, c.y);
    if (zoom.s < 1.05) setZoom(1, 0, 0);
  }, { passive: false });

  // window resized or phone/tablet rotated: re-lay the pages (and switch between one page and spreads)
  var rt;
  function onResize() {
    if (!isOpen) return;
    clearTimeout(rt);
    rt = setTimeout(function () { setViewBtn(); if (useSpread() !== spread || useFit() !== fit) render(); else { layout(); setZoom(1, 0, 0); } }, 120);
  }
  window.addEventListener('resize', onResize);
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(stage);

  function fromHash() {
    var m = /^#ms-(\d+)$/.exec(location.hash);
    if (m) open(+m[1]); else if (isOpen) close();
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
