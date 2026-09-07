/* ============================================================
   Lives of Faith — PWA support
   Registers the service worker (js/../sw.js) and, when a new
   version has been cached, shows a small unobtrusive prompt to
   refresh. No effect on browsers without service-worker support.
   ============================================================ */
(function () {
  if (!('serviceWorker' in navigator)) return;

  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  function showUpdateToast(worker) {
    if (document.getElementById('laf-update-toast')) return;

    var toast = document.createElement('div');
    toast.id = 'laf-update-toast';
    toast.setAttribute('role', 'status');
    toast.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:1rem', 'transform:translateX(-50%)',
      'z-index:9999', 'background:#1c3d5a', 'color:#fff',
      'padding:0.6rem 0.9rem', 'border-radius:8px',
      'box-shadow:0 4px 16px rgba(0,0,0,0.25)', 'font-size:0.85rem',
      'display:flex', 'align-items:center', 'gap:0.75rem', 'max-width:92vw'
    ].join(';');

    var label = document.createElement('span');
    label.textContent = 'A new version is available.';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Refresh';
    btn.style.cssText = [
      'background:#a8832a', 'color:#fff', 'border:0', 'border-radius:6px',
      'padding:0.35rem 0.7rem', 'font:inherit', 'cursor:pointer', 'flex-shrink:0'
    ].join(';');
    btn.addEventListener('click', function () {
      worker.postMessage('SKIP_WAITING');
      btn.disabled = true;
      btn.textContent = 'Updating…';
    });

    toast.appendChild(label);
    toast.appendChild(btn);
    document.body.appendChild(toast);
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      // A worker already waiting from a previous visit.
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(reg.waiting);
      }
      reg.addEventListener('updatefound', function () {
        var installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', function () {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(installing);
          }
        });
      });
    }).catch(function () { /* registration failed — site still works */ });
  });
})();
