(function () {
  'use strict';
  const $ = id => document.getElementById(id), status = $('offline-status');
  const native = !!window.MatchPetNative;
  let installPrompt = null, registration = null, waiting = false;
  const installed = () => native || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function showView(view, scroll = true) {
    if (!['game', 'pet', 'journey'].includes(view)) return;
    document.body.dataset.view = view;
    document.querySelectorAll('[data-view-target]').forEach(button => button.setAttribute('aria-current', button.dataset.viewTarget === view ? 'page' : 'false'));
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  document.querySelectorAll('[data-view-target]').forEach(button => button.addEventListener('click', () => showView(button.dataset.viewTarget)));
  $('level-map').addEventListener('click', event => { const button = event.target.closest('[data-level]'); if (button && !button.disabled) showView('game'); });
  $('pet-back-to-game').onclick = () => showView('game');
  function closeDialog() { $('modal').close(); }
  function showInstall() {
    if (native) {
      if ($('modal').open) $('modal').close();
      $('modal-content').innerHTML = '<span class="install-heading">装进口袋的小快乐</span><h2>果冻已经住进手机啦</h2><p>iPhone 安装版 3.2.0 · 所有游戏与猫咪素材都已装好，不用联网也能玩。</p><p>在设置里可以导出、导入存档。换手机或卸载之前，记得先备份小窝的回忆。</p><button class="primary" id="install-close">继续玩</button>';
      $('install-close').onclick = closeDialog;
      $('modal').showModal(); return;
    }
    if ($('modal').open) $('modal').close();
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    $('modal-content').innerHTML = `<span class="install-heading">把小窝装进口袋</span><h2>${installed() ? '果冻已经住进手机啦' : '每天，都有果冻陪你'}</h2><p>三消、点点连消和猫咪小窝，都可以放到手机主屏幕。</p>${installed() ? '<p class="install-note">等待顶部显示「离线也能玩了」，之后断网也能继续游戏。</p>' : ios ? '<ol class="install-steps"><li>用 <b>Safari 浏览器</b>打开这个页面。</li><li>点「分享」，选择 <b>添加到主屏幕</b>。</li><li>若有「作为网页 App 打开」，保持开启，再点「添加」。</li></ol>' : '<ol class="install-steps"><li>用 <b>Chrome、Edge 或支持安装的浏览器</b>打开页面。</li><li>点浏览器菜单，选择 <b>安装应用</b>或<b>添加到主屏幕</b>。</li><li>安装后，从桌面的小窝图标打开。</li></ol>'}<p>进度只保存在当前设备。换手机前，可以在设置里导出存档。手机上的果冻会在游戏内陪伴你。</p><button class="primary" id="install-confirm">${installPrompt ? '安装到手机' : '知道啦'}</button><button class="text-button" id="install-close">继续玩</button>`;
    $('install-confirm').onclick = async () => {
      if (!installPrompt) { closeDialog(); return; }
      const prompt = installPrompt; installPrompt = null; closeDialog();
      try { await prompt.prompt(); await prompt.userChoice; } catch { /* Browser menu remains available. */ }
      updateStatus();
    };
    $('install-close').onclick = closeDialog;
    $('modal').showModal();
  }
  $('install-app').onclick = showInstall;
  $('desktop-mode').onclick = showInstall;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
  window.addEventListener('appinstalled', () => { installPrompt = null; updateStatus(); });
  function updateStatus() {
    if (native) { status.textContent = '已安装 · 全离线小窝'; $('install-app').hidden = true; return; }
    status.textContent = waiting ? '新版本准备好了' : navigator.serviceWorker?.controller ? navigator.onLine ? '离线也能玩了' : '离线小窝 · 放心玩' : navigator.onLine ? '正在准备离线小窝…' : '当前离线';
    $('install-app').textContent = waiting ? '更新小窝' : installed() ? '已装进手机 ♡' : '安装到手机';
  }
  function readyToUpdate() {
    waiting = true; updateStatus();
    $('install-app').onclick = () => {
      if (window.MatchPetUI?.busy) { status.textContent = '等这次消除结束，再更新哦'; return; }
      window.MatchPetUI?.persist(); registration?.waiting?.postMessage({ type: 'ACTIVATE_UPDATE' });
    };
  }
  window.addEventListener('online', updateStatus); window.addEventListener('offline', updateStatus);
  window.addEventListener('pagehide', () => window.MatchPetUI?.persist(!window.MatchPetUI.busy));
  let refreshing = false;
  if (!native && 'serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) {
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (waiting && !refreshing) { refreshing = true; location.reload(); } else updateStatus(); });
    navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(async reg => {
      registration = reg;
      if (reg.waiting && navigator.serviceWorker.controller) readyToUpdate();
      reg.addEventListener('updatefound', () => { const worker = reg.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) readyToUpdate(); }); });
      await navigator.serviceWorker.ready; updateStatus();
      try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch { /* Export remains available as a backup. */ }
    }).catch(() => { status.textContent = '可以在线玩 · 离线准备未完成'; });
  } else status.textContent = '在线小窝';
  window.MatchPetNativeEvents = {
    exportResult(success, message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000); },
    pause() { const ui = window.MatchPetUI; if (ui) { ui.persist(!ui.busy); ui.audio.setPaused(true); } },
    resume() { const ui = window.MatchPetUI; if (ui) ui.audio.setPaused(document.hidden || !$('pause-cover').hidden); }
  };
  showView('game', false); updateStatus();
})();
