// English SAGA — Settings screen
// 色見本(丸ボタン)で選んだ色を APPLY 時に localStorage へ保存する。
// 保存された値は theme.js が全画面共通で読み込み、CSS変数に反映する。
// Cancel は何も保存せず TOP へ戻る。
//
// APPLY 時に「文字色×ボタン色」「文字色×背景色」のコントラスト比を計算し、
// MIN_CONTRAST(4.5:1)に満たない組み合わせは保存せずメッセージを表示する。
// 保存形式は従来どおり { text, button, back } の HEX 文字列(theme.js 側は変更不要)。

const STORAGE_KEY = "englishSaga:themeColors";
const MIN_CONTRAST = 4.5; // WCAG AA(通常サイズの文字)

// 各リストの先頭(Default)が初期値。色相が偏らないよう追加分も含めて並べている。
const PALETTES = {
  text: [
    { name: "Default", hex: "#12181C" },
    { name: "Charcoal", hex: "#2E2E2E" },
    { name: "Navy", hex: "#1B2A4A" },
    { name: "Slate", hex: "#3C4858" },
    { name: "Dark Green", hex: "#1F3D34" },
    { name: "Maroon", hex: "#4A1C20" },
    { name: "Brown", hex: "#492C18" },
    { name: "Bronze", hex: "#493C12" },
    { name: "Olive", hex: "#364116" },
    { name: "Forest", hex: "#193E19" },
    { name: "Teal", hex: "#103D41" },
    { name: "Indigo", hex: "#261D53" },
    { name: "Purple", hex: "#3C2150" },
    { name: "Plum", hex: "#4B2047" },
    { name: "Wine", hex: "#501B31" },
  ],
  button: [
    { name: "Default", hex: "#6CE4CF" },
    { name: "Coral", hex: "#FF8C7A" },
    { name: "Sky Blue", hex: "#6CB4E4" },
    { name: "Amber", hex: "#F2B84B" },
    { name: "Lavender", hex: "#B79CED" },
    { name: "Rose", hex: "#F2879B" },
    { name: "Peach", hex: "#FFB185" },
    { name: "Lemon", hex: "#F7E364" },
    { name: "Lime", hex: "#B7DD5F" },
    { name: "Apple", hex: "#95DE7C" },
    { name: "Spring", hex: "#7CDE9A" },
    { name: "Aqua", hex: "#6CD5E5" },
    { name: "Periwinkle", hex: "#91A4F3" },
    { name: "Orchid", hex: "#D195E4" },
    { name: "Magenta", hex: "#EB8ED9" },
    { name: "Silver", hex: "#C1C7CD" },
  ],
  back: [
    { name: "Default", hex: "#EEF9F6" },
    { name: "Cream", hex: "#FBF3E7" },
    { name: "Soft Gray", hex: "#EDEFF1" },
    { name: "Blush", hex: "#FBEAEE" },
    { name: "Sky", hex: "#E8F2FB" },
    { name: "Peach Mist", hex: "#FDEEE7" },
    { name: "Lemon Mist", hex: "#FDFBDD" },
    { name: "Lime Mist", hex: "#EFF8E2" },
    { name: "Green Mist", hex: "#E5F5E6" },
    { name: "Aqua Mist", hex: "#E3F5F7" },
    { name: "Periwinkle Mist", hex: "#EDEEFD" },
    { name: "Lilac", hex: "#F5EEFC" },
    { name: "Orchid Mist", hex: "#FAEBFA" },
    { name: "Sand", hex: "#F1ECE4" },
    { name: "Sage", hex: "#E9EEE7" },
  ],
};

const GROUPS = [
  { key: "text", container: document.getElementById("textColorSwatches") },
  { key: "button", container: document.getElementById("buttonColorSwatches") },
  { key: "back", container: document.getElementById("backColorSwatches") },
];

const applyBtn = document.getElementById("applyBtn");
const cancelBtn = document.getElementById("cancelBtn");
const messageEl = document.getElementById("contrastMessage");

// 選択中の色(HEX)。初期値は各パレットの先頭(Default)
const selection = {
  text: PALETTES.text[0].hex,
  button: PALETTES.button[0].hex,
  back: PALETTES.back[0].hex,
};

// --- 保存済みの設定の読み込み ---

function loadSavedTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("テーマ設定の読み込みに失敗しました:", err);
    return null;
  }
}

const saved = loadSavedTheme();
if (saved) {
  GROUPS.forEach(({ key }) => {
    // パレットに無い値(手で書き換えられた等)は無視して Default のままにする
    const hit = PALETTES[key].find((c) => c.hex.toLowerCase() === String(saved[key] || "").toLowerCase());
    if (hit) selection[key] = hit.hex;
  });
}

// --- 色見本の描画 ---

function updatePressed(container, hex) {
  container.querySelectorAll(".swatch").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.hex === hex));
  });
}

GROUPS.forEach(({ key, container }) => {
  PALETTES[key].forEach((color) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.dataset.hex = color.hex;
    btn.style.setProperty("--swatch", color.hex);
    // 名前は画面には出さず、読み上げ用にだけ持たせる
    btn.setAttribute("aria-label", color.name);
    btn.addEventListener("click", () => {
      selection[key] = color.hex;
      updatePressed(container, color.hex);
      hideMessage(); // 選び直したら前回の警告は消す
    });
    container.appendChild(btn);
  });
  updatePressed(container, selection[key]);
});

// --- コントラスト判定 ---

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const [hi, lo] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

// 基準未満の組み合わせを、表示用の文章にして返す(問題が無ければ空配列)
function findContrastProblems() {
  const checks = [
    { label: "文字色とボタン色", other: selection.button },
    { label: "文字色と背景色", other: selection.back },
  ];
  const problems = [];
  checks.forEach(({ label, other }) => {
    const ratio = contrastRatio(selection.text, other);
    if (ratio < MIN_CONTRAST) {
      // 4.49 が「4.5」と表示されて基準未満に見えないよう、小数第1位は切り捨てる
      const shown = (Math.floor(ratio * 10) / 10).toFixed(1);
      problems.push(
        `${label}の組み合わせは読みにくいため保存できません(コントラスト比 ${shown}:1 / ${MIN_CONTRAST}:1 以上が必要)。`
      );
    }
  });
  return problems;
}

function showMessage(lines) {
  messageEl.replaceChildren(
    ...lines.map((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      return p;
    })
  );
  messageEl.hidden = false;
}

function hideMessage() {
  messageEl.hidden = true;
  messageEl.replaceChildren();
}

// --- ボタン ---

applyBtn.addEventListener("click", () => {
  const problems = findContrastProblems();
  if (problems.length > 0) {
    showMessage([...problems, "どちらかの色を選び直してください。"]);
    return; // 保存せず、この画面に留まる
  }

  const theme = {
    text: selection.text,
    button: selection.button,
    back: selection.back,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch (err) {
    console.error("テーマ設定の保存に失敗しました:", err);
  }

  window.location.href = "index.html";
});

cancelBtn.addEventListener("click", () => {
  // 何も保存せずTOPへ戻る
  window.location.href = "index.html";
});
