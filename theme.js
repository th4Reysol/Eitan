// English SAGA — 共通テーマ適用スクリプト
// index.html / game.html / settings.html それぞれの <head> で最初に読み込む。
// localStorage に保存済みのカラー設定があれば、CSS変数(--color-ink 等)を
// 上書きして全画面に反映する。保存が無ければ main.css のデフォルト色を使う。
//
// ボタン色からは次の色も自動で作る:
//   --color-mint-strong / --color-mint-press / --color-mint-soft
//     … ボタン色の濃淡違い(正解タイルの強調・ホバー・不正解タイルの背景)
//   --color-cross / --color-cross-soft
//     … ボタン色の補色(色相を180°回転)。不正解の×印・赤枠に使う

(function () {
  const STORAGE_KEY = "englishSaga:themeColors";
  const DEFAULT_BUTTON = "#6CE4CF";

  // --- 色変換ヘルパー ---

  function hexToRgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }
    return [h, s * 100, l * 100];
  }

  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
  }

  function hsl(h, s, l) {
    return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
  }

  // 白背景とのコントラスト比(WCAGの相対輝度で計算)
  function contrastWithWhite(rgb) {
    const [r, g, b] = rgb.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return 1.05 / (lum + 0.05);
  }

  function applyDerivedColors(root, buttonHex) {
    const [h, s, l] = rgbToHsl(...hexToRgb(buttonHex));

    // ボタン色の濃淡違い
    root.style.setProperty("--color-mint-strong", hsl(h, s, Math.max(l - 10, 0)));
    root.style.setProperty("--color-mint-press", hsl(h, s, Math.max(l - 16, 0)));
    root.style.setProperty("--color-mint-soft", hsl(h, s, 95));

    // 補色: 色相を180°回し、薄い背景の上でもはっきり見える濃さになるまで暗くする
    // (黄色系など明るい色相でも×印が埋もれないよう、白とのコントラスト比3:1以上を確保)
    const ch = (h + 180) % 360;
    const cs = 85;
    let cl = 50;
    while (cl > 20 && contrastWithWhite(hslToRgb(ch, cs, cl)) < 3) cl -= 1;

    root.style.setProperty("--color-cross", hsl(ch, cs, cl));
    root.style.setProperty("--color-cross-soft", hsl(ch, cs, 94));
  }

  const root = document.documentElement;
  let theme = null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    theme = raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("テーマ設定の読み込みに失敗しました:", err);
  }

  try {
    if (theme && theme.text) {
      root.style.setProperty("--color-ink", theme.text);
    }
    if (theme && theme.button) {
      root.style.setProperty("--color-mint", theme.button);
    }
    if (theme && theme.back) {
      root.style.setProperty("--color-canvas", theme.back);
      root.style.setProperty("--color-canvas-edge", theme.back);
    }

    applyDerivedColors(root, (theme && theme.button) || DEFAULT_BUTTON);
  } catch (err) {
    console.error("テーマ設定の適用に失敗しました:", err);
  }
})();
