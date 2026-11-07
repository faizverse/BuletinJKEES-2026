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
