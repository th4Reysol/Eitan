// English SAGA — Quiz screen
// URLの ?csv= で渡されたCSVファイルを読み込み、4択クイズを出題する。
// CSVの想定フォーマット: 1行1語で「英単語,日本語訳」(ヘッダー行は任意)
//   例)
//   english,japanese
//   apple,りんご
//   negotiate,交渉する

const params = new URLSearchParams(window.location.search);
const category = params.get("category") || "";
const csvPath = params.get("csv");

const wordEl = document.getElementById("quizWord");
const fiftyFiftyBtn = document.getElementById("fiftyFiftyBtn");
const tiles = Array.from(document.querySelectorAll(".menu .tile"));

let pool = [];
let current = null;
let locked = false;
let fiftyFiftyUsed = false; // このボタンを今の問題で使用済みか
let correct_Ans = []; // 正解した単語の履歴 [{ en, ja }, ...]
let wrong_Ans = [];   // 不正解だった問題の「正解」情報の履歴 [{ en, ja }, ...]

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// --- CSVパース (ダブルクォート囲み・カンマ含みの値にも対応した簡易パーサー) ---

function parseCSVLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseCSV(text) {
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter((line) => line.trim().length > 0 && !line.trim().startsWith("#"));

  if (lines.length === 0) return [];

  const rows = lines.map(parseCSVLine);

  // 1行目が "english,japanese" のようなヘッダーなら除外する
  const isHeader = /^(en|eng|english|word)$/i.test(rows[0][0] || "");
  const dataRows = isHeader ? rows.slice(1) : rows;

  return dataRows
    .filter((r) => r[0] && r[1])
    .map((r) => ({ en: r[0], ja: r[1] }));
}

// --- 出題ロジック ---

function pickQuestion() {
  const answer = pool[Math.floor(Math.random() * pool.length)];
  const distractors = shuffle(pool.filter((w) => w.en !== answer.en)).slice(0, 3);
  const options = shuffle([answer, ...distractors]);
  return { answer, options };
}

function renderQuestion() {
  current = pickQuestion();
  locked = false;
  wordEl.textContent = current.answer.en;

  tiles.forEach((tile, i) => {
    const option = current.options[i];
    tile.querySelector(".tile__label").textContent = option.ja;
    tile.dataset.ja = option.ja;
    tile.classList.remove("tile--correct", "tile--incorrect", "tile--locked");
    tile.disabled = false;
  });

  // 新しい問題になったら50:50を再び使えるようにする
  fiftyFiftyUsed = false;
  if (fiftyFiftyBtn) {
    fiftyFiftyBtn.disabled = false;
    fiftyFiftyBtn.classList.remove("tile--locked");
  }
}

function handleAnswer(tile) {
  if (locked || !current) return;
  locked = true;

  const isCorrect = tile.dataset.ja === current.answer.ja;

  if (isCorrect) {
    correct_Ans.push({ en: current.answer.en, ja: current.answer.ja });
  } else {
    wrong_Ans.push({ en: current.answer.en, ja: current.answer.ja });
  }

  tiles.forEach((t) => {
    t.disabled = true;
    t.classList.add("tile--locked");
    if (t.dataset.ja === current.answer.ja) {
      t.classList.add("tile--correct");
    } else if (t === tile && !isCorrect) {
      t.classList.add("tile--incorrect");
    }
  });

  window.setTimeout(renderQuestion, 900);
}

tiles.forEach((tile) => {
  tile.addEventListener("click", () => handleAnswer(tile));
});

// --- 50:50(不正解の選択肢を2つグレーアウト) ---

function useFiftyFifty() {
  if (locked || !current || fiftyFiftyUsed) return;

  const incorrectTiles = tiles.filter((t) => t.dataset.ja !== current.answer.ja);
  const toGrayOut = shuffle(incorrectTiles).slice(0, 2);

  toGrayOut.forEach((t) => {
    t.disabled = true;
    t.classList.add("tile--locked");
  });

  fiftyFiftyUsed = true;
  if (fiftyFiftyBtn) {
    fiftyFiftyBtn.disabled = true;
    fiftyFiftyBtn.classList.add("tile--locked");
  }
}

if (fiftyFiftyBtn) {
  fiftyFiftyBtn.addEventListener("click", useFiftyFifty);
}

function showError(message) {
  wordEl.textContent = message;
  tiles.forEach((t) => {
    t.querySelector(".tile__label").textContent = "-";
    t.disabled = true;
    t.classList.add("tile--locked");
  });
}

async function loadPool() {
  if (!csvPath) {
    showError("CSVが指定されていません");
    return;
  }

  wordEl.textContent = "読み込み中…";

  try {
    const res = await fetch(csvPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parsed = parseCSV(text);

    // この端末で既に正解済みの単語は出題から除外する。
    // ただし除外した結果4語未満になる場合は、4択を作れるよう全単語に戻す。
    const mastered = getMasteredWords(category);
    const remaining = parsed.filter((w) => !mastered.has(w.en));
    pool = remaining.length >= 4 ? remaining : parsed;

    if (pool.length < 4) {
      throw new Error("CSVの単語数が4未満です(4択を作れません)");
    }

    renderQuestion();
  } catch (err) {
    console.error(`[${category}] ${csvPath} の読み込みに失敗しました:`, err);
    showError("CSVを読み込めませんでした");
  }
}

loadPool();

// --- 結果の保存(localStorage) ---
// ・correct_Ans に含まれる単語は「習得済み」として localStorage に記録し、
//   以後そのカテゴリの出題から除外する
// ・wrong_Ans は localStorage に蓄積しつつ、TOPに戻るタイミングで
//   yyyyMMdd_hhmmss.csv としてブラウザのダウンロード機能で保存する
// PC/Android/GitHub Pagesなど環境を問わず同じコードで動作する。

const MASTERED_KEY_PREFIX = "englishSaga:masteredWords:";
const REVIEW_KEY = "englishSaga:reviewWords";

function getMasteredWords(cat) {
  if (!cat) return new Set();
  try {
    const raw = localStorage.getItem(MASTERED_KEY_PREFIX + cat);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (err) {
    console.error("習得済み単語の読み込みに失敗しました:", err);
    return new Set();
  }
}

function addMasteredWords(cat, words) {
  if (!cat || words.length === 0) return;
  const set = getMasteredWords(cat);
  words.forEach((w) => set.add(w));
  localStorage.setItem(MASTERED_KEY_PREFIX + cat, JSON.stringify([...set]));
}

function appendReviewWords(cat, entries) {
  if (entries.length === 0) return;
  let list = [];
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch (err) {
    list = [];
  }
  const ts = new Date().toISOString();
  entries.forEach((e) => list.push({ ...e, category: cat, ts }));
  localStorage.setItem(REVIEW_KEY, JSON.stringify(list));
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${MM}${dd}_${hh}${mm}${ss}`;
}

// wrong_Ans をCSVとして端末にダウンロードする(for_reviewフォルダの代わり)
function downloadReviewCsv(entries) {
  if (entries.length === 0) return;
  const body = entries.map((w) => `${w.en},${w.ja}`).join("\r\n") + "\r\n";
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${formatTimestamp(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleExit() {
  try {
    addMasteredWords(category, correct_Ans.map((w) => w.en));
    appendReviewWords(category, wrong_Ans);
    downloadReviewCsv(wrong_Ans);
  } catch (err) {
    console.error("結果の保存に失敗しました:", err);
  }

  window.location.href = "index.html";
}

const exitBtn = document.getElementById("exitBtn");
if (exitBtn) {
  exitBtn.addEventListener("click", handleExit);
}
