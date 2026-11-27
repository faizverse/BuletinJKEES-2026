(function () {
  var btn = document.getElementById('share');
  if (!btn) return;
  var label = btn.textContent;

  function said(text) {
    btn.textContent = text;
    setTimeout(function () { btn.textContent = label; }, 2000);
  }

  // Older copy method, for browsers that refuse the Clipboard API.
  function copyOld(url) {
    var ta = document.createElement('textarea');
    ta.value = url;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copy(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { said('Pautan disalin'); }, function () {
        if (copyOld(url)) said('Pautan disalin'); else window.prompt('Salin pautan ini:', url);
      });
    } else if (copyOld(url)) {
      said('Pautan disalin');
    } else {
      window.prompt('Salin pautan ini:', url);
    }
  }

  btn.addEventListener('click', function () {
    var url = location.href.split('#')[0].split('?')[0];
    if (navigator.share) {
      navigator.share({ title: 'Buletin JKEES 2026', text: 'Buletin JKEES 2026 · Setahun yang Gemilang', url: url }).catch(function () {});
    } else {
      copy(url);
    }
  });
})();

// trailer: YouTube loads only when tapped
(function () {
  var b = document.querySelector('.yt-play');
  if (!b) return;
  b.addEventListener('click', function () {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-id') + '?autoplay=1&controls=1&rel=0&playsinline=1';
    f.title = 'Buletin JKEES 2026: Setahun yang Gemilang (Video Imbasan)';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    b.parentNode.replaceChild(f, b);
  });
})();

// phone: the "Baca buletin" bar appears once the hero has scrolled away
(function () {
  var bar = document.getElementById('bar'), hero = document.querySelector('.hero');
  if (!bar || !hero || !('IntersectionObserver' in window)) return;
  // hidden while the hero or the trailer is on screen, so it never covers the video's controls
  var trailer = document.getElementById('treler'), seen = {};
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { seen[e.target === hero ? 'hero' : 'treler'] = e.isIntersecting; });
    var on = !seen.hero && !seen.treler;
    bar.classList.toggle('on', on);
    bar.setAttribute('aria-hidden', on ? 'false' : 'true');
    bar.tabIndex = on ? 0 : -1;
  });
  io.observe(hero);
  if (trailer) io.observe(trailer);
})();
