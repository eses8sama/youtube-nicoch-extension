// popup.js

const DEFAULTS = { speed: 3, fontsize: 28, opacity: 0.9, lanes: 12 };

const ids = ['speed', 'fontsize', 'opacity', 'lanes'];

function showSaved() {
  const el = document.getElementById('saved-msg');
  el.textContent = '✓ 保存しました';
  setTimeout(() => { el.textContent = ''; }, 1500);
}

// 保存済み設定を読み込んでスライダーに反映
chrome.storage.local.get(DEFAULTS, (vals) => {
  for (const key of ids) {
    const slider = document.getElementById(key);
    slider.value = vals[key];
    document.getElementById('val-' + key).textContent = vals[key];
  }
});

// スライダー変更 → 即保存 → コンテンツスクリプトへ通知
for (const key of ids) {
  const slider = document.getElementById(key);
  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    document.getElementById('val-' + key).textContent = slider.value;
    const data = {};
    data[key] = val;
    chrome.storage.local.set(data, () => {
      // アクティブなYouTubeタブへ設定変更を送信
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'NICOCH_CONFIG', key, val });
        }
      });
      showSaved();
    });
  });
}

// テスト送信
document.getElementById('btn-test').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'NICOCH_TEST' });
    }
  });
});

// リセット
document.getElementById('btn-reset').addEventListener('click', () => {
  chrome.storage.local.set(DEFAULTS, () => {
    for (const key of ids) {
      document.getElementById(key).value = DEFAULTS[key];
      document.getElementById('val-' + key).textContent = DEFAULTS[key];
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'NICOCH_RESET', defaults: DEFAULTS });
      }
    });
    showSaved();
  });
});
