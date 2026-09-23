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

function applyLabelSizeClass(labelEl, text) {
  labelEl.classList.remove("tile__label--long", "tile__label--very-long");
  if (text.length > 45) {
    labelEl.classList.add("tile__label--very-long");
  } else if (text.length > 22) {
    labelEl.classList.add("tile__label--long");
  }
}

function renderQuestion() {
  current = pickQuestion();
  locked = false;
  wordEl.textContent = current.answer.en;

  tiles.forEach((tile, i) => {
    const option = current.options[i];
    const labelEl = tile.querySelector(".tile__label");
    labelEl.textContent = option.ja;
    applyLabelSizeClass(labelEl, option.ja);
    tile.dataset.ja = option.ja;
    tile.classList.remove("tile--correct", "tile--incorrect", "tile--wrong", "tile--locked");
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

  // 結果は回答した瞬間に localStorage へ保存する
  // (Back to TOP を押さずにタブを閉じても、習得済み・間違いの記録が消えないようにするため)
  if (isCorrect) {
    correct_Ans.push({ en: current.answer.en, ja: current.answer.ja });
    saveSafely(() => addMasteredWords(category, [current.answer.en]));
  } else {
    wrong_Ans.push({ en: current.answer.en, ja: current.answer.ja });
    saveSafely(() => appendReviewWords(category, [{ en: current.answer.en, ja: current.answer.ja }]));
    // 間違えたらその場で avengers/avengers.csv に書き足す(クリック操作中に呼ぶ必要がある)
    appendWrongToAvengers({ en: current.answer.en, ja: current.answer.ja });
  }

  tiles.forEach((t) => {
    t.disabled = true;
    t.classList.add("tile--locked");
    if (t.dataset.ja === current.answer.ja) {
      // 正解の選択肢: 強調表示(✓バッジ・拡大・枠線)
      t.classList.add("tile--correct");
    } else {
      // 不正解の選択肢: すべてに赤い×印を付ける
      t.classList.add("tile--wrong");
      // 自分が選んでしまった不正解は、さらに赤枠で目立たせる
      if (t === tile) t.classList.add("tile--incorrect");
    }
  });

  // 間違えたときは正解を確認できるよう、次の問題までの時間を長めにとる
  window.setTimeout(renderQuestion, isCorrect ? 900 : 1800);
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
// ・正解した単語は、回答した瞬間に「習得済み」として localStorage に記録し、
//   以後そのカテゴリの出題から除外する(次回の読み込みから反映)
// ・間違えた単語は、回答した瞬間に localStorage に蓄積し、TOPに戻るときに yyyyMMdd_hhmmss.csv
//   としてダウンロードし、さらに間違えるたびに avengers/avengers.csv へ書き足す
//   (詳細は下の「間違えた問題の保存」の説明)
// PC/Android/GitHub Pagesなど環境を問わず同じコードで動作する。

const MASTERED_KEY_PREFIX = "englishSaga:masteredWords:";
const REVIEW_KEY = "englishSaga:reviewWords";

function saveSafely(fn) {
  try {
    fn();
  } catch (err) {
    console.error("結果の保存に失敗しました:", err);
  }
}

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

// --- 間違えた問題の保存 ---
// 間違えた問題は、次の2か所に保存する。
//
// (1) ダウンロードフォルダ … 従来どおり「Back to TOP」を押したときに、
//     このプレイ分の間違いを yyyyMMdd_hhmmss.csv としてダウンロードする。
//     (ファイル名はクイズを開始した日時)
//
// (2) avengers フォルダ … 間違えるたびに avengers/avengers.csv へ1行ずつ書き足す。
//     すでに avengers.csv にある英単語は重複して書き足さない。
//     ブラウザは任意のフォルダへ勝手に書き込めないため、Chrome/Edge の
//     File System Access API を使う。初回だけフォルダ選択画面が出るので
//     Eitan/avengers を選ぶ。選んだフォルダは IndexedDB に記憶し、次回以降は
//     自動で同じフォルダへ書き足す(ページを開き直した直後は、Chromeが
//     保存の許可を確認することがある)。
//     この機能が使えないブラウザ(Android/Safari/Firefoxなど)や、フォルダ選択を
//     キャンセルした場合は (2) を行わず、(1) だけになる。

const sessionFileName = `${formatTimestamp(new Date())}.csv`;
const AVENGERS_FILE = "avengers.csv";
const AVENGERS_DB = "englishSaga";
const AVENGERS_STORE = "handles";
const AVENGERS_KEY = "avengersDir";

let avengersPickerDeclined = false; // この回でフォルダ選択をキャンセルしたか
let avengersWriteChain = Promise.resolve(); // 書き込みを順番に実行するためのキュー

function csvCell(value) {
  const v = String(value ?? "");
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function buildReviewCsv(entries) {
  return entries.map((w) => `${csvCell(w.en)},${csvCell(w.ja)}`).join("\r\n") + "\r\n";
}

function openHandleDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AVENGERS_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(AVENGERS_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadAvengersDir() {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(AVENGERS_STORE).objectStore(AVENGERS_STORE).get(AVENGERS_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function storeAvengersDir(handle) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AVENGERS_STORE, "readwrite");
    tx.objectStore(AVENGERS_STORE).put(handle, AVENGERS_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 書き込み可能な avengers フォルダを取得する(無ければ選択してもらう)
async function getAvengersDir() {
  let dir = await loadAvengersDir();

  if (dir) {
    const opts = { mode: "readwrite" };
    if ((await dir.queryPermission(opts)) === "granted") return dir;
    if ((await dir.requestPermission(opts)) === "granted") return dir;
    dir = null; // 許可されなかった場合は選び直してもらう
  }

  if (avengersPickerDeclined) return null;
  try {
    dir = await window.showDirectoryPicker({ id: "avengers", mode: "readwrite", startIn: "desktop" });
  } catch (err) {
    avengersPickerDeclined = true; // キャンセル時は、この回はもう聞かない
    return null;
  }
  if (dir.name !== "avengers") {
    console.warn(`選択されたフォルダは「${dir.name}」です(avengers ではありません)`);
  }
  await storeAvengersDir(dir);
  return dir;
}

// avengers.csv の末尾に1語書き足す(既にある英単語なら何もしない)
function appendWrongToAvengers(entry) {
  if (typeof window.showDirectoryPicker !== "function") return; // 非対応ブラウザ

  avengersWriteChain = avengersWriteChain.then(async () => {
    try {
      const dir = await getAvengersDir();
      if (!dir) return;

      const fileHandle = await dir.getFileHandle(AVENGERS_FILE, { create: true });
      const file = await fileHandle.getFile();
      const existing = await file.text();

      const known = new Set(
        existing
          .split(/\r\n|\n|\r/)
          .filter((line) => line.trim().length > 0)
          .map((line) => parseCSVLine(line)[0])
      );
      if (known.has(entry.en)) return;

      // 既存の内容を残したまま、ファイルの末尾に書き足す
      const writable = await fileHandle.createWritable({ keepExistingData: true });
      await writable.seek(file.size);
      const needsNewline = existing.length > 0 && !/[\r\n]$/.test(existing);
      await writable.write((needsNewline ? "\r\n" : "") + buildReviewCsv([entry]));
      await writable.close();
    } catch (err) {
      console.error("avengers.csv への書き足しに失敗しました:", err);
    }
  });
}

// このプレイ分の間違いをCSVとして端末のダウンロードフォルダに保存する
function downloadReviewCsv(entries) {
  if (entries.length === 0) return;
  const blob = new Blob([buildReviewCsv(entries)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sessionFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleExit() {
  try {
    // 習得済み・間違いの localStorage 保存は回答時に済んでいるので、ここではCSVのダウンロードのみ
    downloadReviewCsv(wrong_Ans);
    // avengers.csv への書き足しが終わってから画面を移動する
    await avengersWriteChain;
  } catch (err) {
    console.error("結果の保存に失敗しました:", err);
  }

  window.location.href = "index.html";
}

const exitBtn = document.getElementById("exitBtn");
if (exitBtn) {
  exitBtn.addEventListener("click", handleExit);
}
