// English SAGA — Settings screen
// 3つのドロップダウンで選んだ色を APPLY 時に localStorage へ保存する。
// 保存された値は theme.js が全画面共通で読み込み、CSS変数に反映する。
// Cancel は何も保存せず TOP へ戻る。

const STORAGE_KEY = "englishSaga:themeColors";

const textSelect = document.getElementById("textColorSelect");
const buttonSelect = document.getElementById("buttonColorSelect");
const backSelect = document.getElementById("backColorSelect");
const applyBtn = document.getElementById("applyBtn");
const cancelBtn = document.getElementById("cancelBtn");

// 保存済みの設定があれば、プルダウンの選択状態に反映する
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
  if (saved.text) textSelect.value = saved.text;
  if (saved.button) buttonSelect.value = saved.button;
  if (saved.back) backSelect.value = saved.back;
}

applyBtn.addEventListener("click", () => {
  const theme = {
    text: textSelect.value,
    button: buttonSelect.value,
    back: backSelect.value,
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
