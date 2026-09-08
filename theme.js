// English SAGA — 共通テーマ適用スクリプト
// index.html / game.html / settings.html それぞれの <head> で最初に読み込む。
// localStorage に保存済みのカラー設定があれば、CSS変数(--color-ink 等)を
// 上書きして全画面に反映する。保存が無ければ何もせず main.css のデフォルト色のまま。

(function () {
  const STORAGE_KEY = "englishSaga:themeColors";

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const theme = JSON.parse(raw);
    const root = document.documentElement;

    if (theme.text) {
      root.style.setProperty("--color-ink", theme.text);
    }
    if (theme.button) {
      root.style.setProperty("--color-mint", theme.button);
    }
    if (theme.back) {
      root.style.setProperty("--color-canvas", theme.back);
      root.style.setProperty("--color-canvas-edge", theme.back);
    }
  } catch (err) {
    console.error("テーマ設定の適用に失敗しました:", err);
  }
})();
