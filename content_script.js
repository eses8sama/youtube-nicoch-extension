// ============================================================
// content_script.js  ― 描画担当（設定はpopup経由で受け取る）
// ============================================================
(function () {
  'use strict';

  const CONFIG = {
    LANE_COUNT: 12,
    SPEED: 3,
    FONT_SIZE: 28,
    FONT_COLOR: '#ffffff',
    STROKE_COLOR: '#000000',
    FONT_FAMILY: 'Arial, "Hiragino Kaku Gothic Pro", "Meiryo", sans-serif',
    COMMENT_OPACITY: 0.9,
  };

  // 保存済み設定を起動時に読み込む
  chrome.storage.local.get(
    { speed: 3, fontsize: 28, opacity: 0.9, lanes: 12 },
    (vals) => {
      CONFIG.SPEED        = vals.speed;
      CONFIG.FONT_SIZE    = vals.fontsize;
      CONFIG.COMMENT_OPACITY = vals.opacity;
      CONFIG.LANE_COUNT   = vals.lanes;
      if (overlayCanvas) initLanes(overlayCanvas.height);
    }
  );

  // popupからのメッセージ受信
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'NICOCH_CONFIG') {
      if (msg.key === 'speed')    CONFIG.SPEED           = msg.val;
      if (msg.key === 'fontsize') CONFIG.FONT_SIZE        = msg.val;
      if (msg.key === 'opacity')  CONFIG.COMMENT_OPACITY  = msg.val;
      if (msg.key === 'lanes') {
        CONFIG.LANE_COUNT = msg.val;
        if (overlayCanvas) initLanes(overlayCanvas.height);
      }
    }
    if (msg.type === 'NICOCH_TEST') {
      addComment('🎉 これはテストコメントです！');
    }
    if (msg.type === 'NICOCH_RESET') {
      CONFIG.SPEED           = msg.defaults.speed;
      CONFIG.FONT_SIZE        = msg.defaults.fontsize;
      CONFIG.COMMENT_OPACITY  = msg.defaults.opacity;
      CONFIG.LANE_COUNT       = msg.defaults.lanes;
      if (overlayCanvas) initLanes(overlayCanvas.height);
    }
  });

  let overlayCanvas = null;
  let ctx = null;
  let comments = [];
  let lanes = [];
  let animationId = null;

  function initLanes(height) {
    const laneHeight = height / CONFIG.LANE_COUNT;
    lanes = Array.from({ length: CONFIG.LANE_COUNT }, (_, i) => ({
      y: laneHeight * i + laneHeight * 0.75,
      busyUntilX: 0,
    }));
  }

  function findLane() {
    let best = 0;
    for (let i = 1; i < lanes.length; i++) {
      if (lanes[i].busyUntilX < lanes[best].busyUntilX) best = i;
    }
    return best;
  }

  function addComment(text) {
    if (!overlayCanvas || !ctx || !text) return;
    ctx.font = `bold ${CONFIG.FONT_SIZE}px ${CONFIG.FONT_FAMILY}`;
    const textWidth = ctx.measureText(text).width;
    const speed = CONFIG.SPEED + Math.random() * 1;
    const laneIndex = findLane();
    lanes[laneIndex].busyUntilX = overlayCanvas.width + textWidth;
    comments.push({
      text, x: overlayCanvas.width,
      y: lanes[laneIndex].y,
      speed, textWidth,
      fontSize: CONFIG.FONT_SIZE
    });
  }

  function drawLoop() {
    if (!overlayCanvas || !ctx) return;
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    ctx.save();
    ctx.globalAlpha = CONFIG.COMMENT_OPACITY;
    ctx.textBaseline = 'alphabetic';

    for (const lane of lanes) {
      lane.busyUntilX = Math.max(0, lane.busyUntilX - CONFIG.SPEED);
    }

    comments = comments.filter(c => c.x + c.textWidth > 0);
    for (const c of comments) {
      c.x -= c.speed;
      ctx.font = `bold ${c.fontSize}px ${CONFIG.FONT_FAMILY}`;
      ctx.strokeStyle = CONFIG.STROKE_COLOR;
      ctx.lineWidth = Math.max(3, c.fontSize / 8);
      ctx.lineJoin = 'round';
      ctx.strokeText(c.text, c.x, c.y);
      ctx.fillStyle = CONFIG.FONT_COLOR;
      ctx.fillText(c.text, c.x, c.y);
    }
    ctx.restore();
    animationId = requestAnimationFrame(drawLoop);
  }

  function setupOverlay(player) {
    if (document.getElementById('nicoch-overlay')) return;
    overlayCanvas = document.createElement('canvas');
    overlayCanvas.id = 'nicoch-overlay';

    const resize = () => {
      overlayCanvas.width = player.offsetWidth || 1280;
      overlayCanvas.height = player.offsetHeight || 720;
      initLanes(overlayCanvas.height);
    };
    resize();
    new ResizeObserver(resize).observe(player);
    player.style.position = 'relative';
    player.appendChild(overlayCanvas);
    ctx = overlayCanvas.getContext('2d');
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(drawLoop);
    console.log('[NicoCh] Canvas overlay ready.');
  }

  // chat_observer.js からのコメント受信
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'NICOCH_COMMENT') {
      addComment(e.data.text);
    }
  });

  function init() {
    const player = document.querySelector('.html5-video-player');
    if (player) {
      setupOverlay(player);
    } else {
      setTimeout(init, 1500);
    }
  }

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const old = document.getElementById('nicoch-overlay');
      if (old) old.remove();
      overlayCanvas = null; ctx = null; comments = [];
      if (animationId) cancelAnimationFrame(animationId);
      animationId = null;
      setTimeout(init, 2000);
    }
  }).observe(document.body, { childList: true, subtree: true });

  setTimeout(init, 1500);
})();
