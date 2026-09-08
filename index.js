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
