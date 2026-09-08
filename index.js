// English SAGA — TOP screen
// カテゴリタイルをタップしたら、対応するCSVファイルのパスとカテゴリ名を
// クエリパラメータで引き継いで game.html へ遷移する。

document.querySelectorAll(".menu .tile").forEach((tile) => {
  tile.addEventListener("click", () => {
    const category = tile.dataset.category;
    const csv = tile.dataset.csv;
    const query = new URLSearchParams({ category, csv });
    window.location.href = `game.html?${query.toString()}`;
  });
});

// --- 「Close This App」ボタン ---
// window.close() はブラウザの仕様上、スクリプトが開いたウィンドウでないと効かない。
// Android等で「ホーム画面に追加」してPWAとして起動した場合は閉じられることが多いが、
// 通常のブラウザタブでは閉じられないため、その場合は案内画面を表示するフォールバックを用意する。

const closeAppBtn = document.querySelector(".pill--exit");

if (closeAppBtn) {
  closeAppBtn.addEventListener("click", () => {
    window.close();

    // ここまで実行が続いた = window.close() が効かなかった、ということなので
    // 少し待ってから案内メッセージに切り替える
    window.setTimeout(() => {
      document.body.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;' +
        'height:100vh;font-family:sans-serif;text-align:center;padding:24px;">' +
        "このブラウザでは自動的に閉じられません。<br>タブ(またはアプリ)を手動で閉じてください。" +
        "</div>";
    }, 300);
  });
}
