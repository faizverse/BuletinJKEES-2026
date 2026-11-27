/* Buletin JKEES 2026: the page reader.
   Opens over the page from any link to #ms-N (N = 1..55). Phone: one page at a time, swipe, pinch or double-tap
   to zoom. Computer (wide screens): two-page spreads (1, 2–3, 4–5 … 54–55), arrow keys, click to zoom.
   Loads only the pages on screen and the next/previous ones. */
(function () {
  var B = window.BULETIN;
  var R = document.getElementById('reader');
  if (!B || !R) return;
  var N = B.pages, RATIO = 1600 / 2263;
  var stage = R.querySelector('.rd-stage');
  var view = R.querySelector('.rd-view');
  var count = R.querySelector('.rd-count');
  var title = R.querySelector('.rd-title');
  var grid = R.querySelector('.rd-grid');
  var gridBtn = R.querySelector('[data-grid]');
  var prevBtns = R.querySelectorAll('[data-prev]');
  var nextBtns = R.querySelectorAll('[data-next]');
  var page = 1, spread = false, isOpen = false, scrollBack = 0, focusBack = null, gridBuilt = false;
  var zoom = { s: 1, x: 0, y: 0 };

  function useSpread() { return window.innerWidth >= 900 && window.innerWidth > window.innerHeight * 1.1; }
  function pagesFor(p) {
    if (!spread || p === 1) return [p];
    var left = p % 2 === 0 ? p : p - 1;
    return left + 1 <= N ? [left, left + 1] : [left];
  }
  function clamp(p) { return Math.max(1, Math.min(N, p)); }
  function label(n) { return 'Halaman ' + n + ': ' + B.titles[n]; }

  function setZoom(s, x, y) {
    var w = stage.clientWidth, h = stage.clientHeight;
    s = Math.max(1, Math.min(4, s));
    var mx = (w * (s - 1)) / 2, my = (h * (s - 1)) / 2;
    zoom.s = s;
    zoom.x = s === 1 ? 0 : Math.max(-mx, Math.min(mx, x));
    zoom.y = s === 1 ? 0 : Math.max(-my, Math.min(my, y));
    view.style.transform = 'translate(' + zoom.x + 'px,' + zoom.y + 'px) scale(' + zoom.s + ')';
    R.classList.toggle('zoomed', s > 1);
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
    var pw = Math.min(h * RATIO, w / imgs.length);
    Array.prototype.forEach.call(imgs, function (im) {
      im.style.width = Math.floor(pw) + 'px';
      im.style.height = Math.floor(pw / RATIO) + 'px';
    });
  }

  function preload(p) {
    pagesFor(p).forEach(function (n) {
      var im = new Image();
      im.sizes = spread ? '50vw' : '100vw';
      im.srcset = B.img(n, 800) + ' 800w, ' + B.img(n, 1600) + ' 1600w';
      im.src = B.img(n, 800);
    });
  }

  function render() {
    spread = useSpread();
    var ps = pagesFor(page);
    page = ps[0];
    view.innerHTML = '';
    ps.forEach(function (n) {
      var im = document.createElement('img');
      im.className = 'rd-page';
      im.setAttribute('data-n', n);
      im.alt = label(n);
      im.decoding = 'async';
      im.sizes = ps.length > 1 ? '50vw' : '100vw';
      im.srcset = B.img(n, 800) + ' 800w, ' + B.img(n, 1600) + ' 1600w';
      im.src = B.img(n, 800);
      view.appendChild(im);
    });
    setZoom(1, 0, 0);
    layout();
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
    closeGrid();
    go(p);
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    closeGrid();
    R.hidden = true;
    view.innerHTML = '';
    document.documentElement.classList.remove('rd-on');
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, scrollBack);
    if (focusBack && focusBack.focus) focusBack.focus();
  }

  // page grid
  function buildGrid() {
    if (gridBuilt) return;
    gridBuilt = true;
    var html = '';
    B.sections.forEach(function (s) {
      html += '<h3>' + s.name + '</h3><ul>';
      for (var n = s.from; n <= s.to; n++) {
        html += '<li><a href="#ms-' + n + '" data-go="' + n + '"><img src="' + B.img(n, 240) + '" width="240" height="339" alt="" loading="lazy"><span>' + n + '</span></a></li>';
      }
      html += '</ul>';
    });
    grid.querySelector('.rd-grid-in').innerHTML = html;
  }
  function openGrid() {
    buildGrid();
    grid.hidden = false;
    gridBtn.setAttribute('aria-expanded', 'true');
    Array.prototype.forEach.call(grid.querySelectorAll('a'), function (a) {
      var on = pagesFor(page).indexOf(+a.getAttribute('data-go')) > -1;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var cur = grid.querySelector('a.on');
    if (cur) { cur.scrollIntoView({ block: 'center' }); cur.focus(); }
  }
  function closeGrid() {
    if (grid.hidden) return;
    grid.hidden = true;
    gridBtn.setAttribute('aria-expanded', 'false');
  }
  grid.addEventListener('click', function (e) {
    var a = e.target.closest('[data-go]');
    if (!a) return;
    e.preventDefault();
    closeGrid();
    go(+a.getAttribute('data-go'));
  });

  R.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) close();
    else if (e.target.closest('[data-grid]')) { if (grid.hidden) openGrid(); else closeGrid(); }
    else if (e.target.closest('[data-prev]')) prev();
    else if (e.target.closest('[data-next]')) next();
  });

  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    var k = e.key;
    if (k === 'Escape') {
      e.preventDefault();
      if (!grid.hidden) closeGrid(); else if (zoom.s > 1) setZoom(1, 0, 0); else close();
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
    if (!grid.hidden) return;
    if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); go(1); }
    else if (k === 'End') { e.preventDefault(); go(N); }
  });

  // touch and mouse: swipe, drag to pan, pinch, double-tap or click to zoom
  var pts = {}, start = null, pinch = null, lastTap = 0, moved = false;
  function centre(e) {
    var r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  }
  stage.addEventListener('pointerdown', function (e) {
    if (e.button && e.button !== 0) return;
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
      if (e.pointerType === 'mouse') { if (zoom.s > 1) setZoom(1, 0, 0); else zoomAt(2.5, c.x, c.y); }
      else if (now - lastTap < 320) { lastTap = 0; if (zoom.s > 1) setZoom(1, 0, 0); else zoomAt(2.5, c.x, c.y); }
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
    var c = centre(e);
    zoomAt(zoom.s * Math.exp(-e.deltaY / 100), c.x, c.y);
    if (zoom.s < 1.05) setZoom(1, 0, 0);
  }, { passive: false });

  var rt;
  window.addEventListener('resize', function () {
    if (!isOpen) return;
    clearTimeout(rt);
    rt = setTimeout(function () { if (useSpread() !== spread) render(); else { layout(); setZoom(1, 0, 0); } }, 120);
  });

  function fromHash() {
    var m = /^#ms-(\d+)$/.exec(location.hash);
    if (m) open(+m[1]); else if (isOpen) close();
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
