// ============================================================
// chat_observer.js  ― チャットiframe内で動作
// ============================================================
(function () {
  'use strict';

  console.log('[NicoCh] chat_observer.js loaded.');

  const sent = new Set(); // 重複防止

  function sendComment(text) {
    if (!text || text.trim() === '') return;
    const key = text.trim() + '_' + Date.now();
    // 50ms以内に同じテキストが来たら無視
    const dedupKey = text.trim();
    if (sent.has(dedupKey)) return;
    sent.add(dedupKey);
    setTimeout(() => sent.delete(dedupKey), 500);

    window.parent.postMessage({ type: 'NICOCH_COMMENT', text: text.trim() }, '*');
  }

  function startObserver() {
    const chatList = document.querySelector('#items.yt-live-chat-item-list-renderer')
      || document.querySelector('yt-live-chat-item-list-renderer #items')
      || document.querySelector('#items');

    if (!chatList) {
      setTimeout(startObserver, 1500);
      return;
    }

    console.log('[NicoCh] Chat list found. Observing...');

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          const tag = node.tagName.toLowerCase();

          // 直接追加されたノードだけを見る（subtree不使用で重複防止）
          if (tag === 'yt-live-chat-text-message-renderer') {
            const msg = node.querySelector('#message');
            if (msg) sendComment(msg.textContent);
          } else if (tag === 'yt-live-chat-paid-message-renderer') {
            const msg = node.querySelector('#message');
            if (msg) sendComment('💰 ' + msg.textContent);
          } else if (tag === 'yt-live-chat-membership-item-renderer') {
            const msg = node.querySelector('#header-subtext');
            if (msg) sendComment('⭐ ' + msg.textContent);
          }
        }
      }
    });

    // subtree: false にして直接の子要素追加のみ監視
    observer.observe(chatList, { childList: true, subtree: false });
    console.log('[NicoCh] Observer attached!');
  }

  setTimeout(startObserver, 500);
  setTimeout(startObserver, 2000);
})();
