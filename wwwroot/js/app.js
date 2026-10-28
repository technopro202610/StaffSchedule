/* =========================================================
   app.js：アプリの起動
   1. 見た目（css/*.css・screens/*.css）を読み込む
   2. 画面の HTML（screens/*.html）を読み込んで、<div id="layer"> の前に差し込む
   3. 処理（js/common.js → screens/*.js）を、下の順番どおりに1つずつ読み込む
   4. 全部そろったら起動する（ログイン中ならカレンダー、メールのリンクなら再設定画面）
   画面やファイルを増やしたときは、下の3つの一覧に追加してください。
   ========================================================= */
"use strict";

// 見た目（上から順に読み込む。あとのファイルほど優先される）
const STYLES = [
  "css/common.css", // 共通（色・文字・ボタン・入力欄）
  "screens/no01_login.css", // No1  ログイン（No2・No9・No10 も同じ枠を使う）
  "screens/no03_calendar.css", // No3  カレンダー
  "screens/no05_member_form.css", // No5  メンバー登録・編集
  "screens/no11_12_notice.css", // No11・No12 お知らせ
  "screens/no06_07_13_confirm.css", // No6・No7・No13 確認ダイアログ
  "screens/no04_schedule.css", // No4  予定登録
  "screens/no08_year.css", // No8  年間カレンダー
  "screens/no09_reset.css", // No9  パスワード再設定
  "css/common_dialog.css", // ダイアログ・ポップアップ・トースト（共通。最後に読み込む）
];

// 画面の HTML（No は詳細設計書の画面番号）
const SCREEN_HTML = [
  "screens/no01_login.html", // No1  ログイン
  "screens/no02_register.html", // No2  新規会員登録
  "screens/no09_reset.html", // No9  パスワード再設定
  "screens/no10_mail_sent.html", // No10 メール送信完了
  "screens/no03_calendar.html", // No3  カレンダー（ヘッダー・メンバー一覧・予定表）
];

// 処理（上から順に読み込む。common.js は必ず最初）
const SCRIPTS = [
  "js/common.js", // 共通部品（api・トースト・日付・保存データなど）
  "screens/no01_login.js", // No1  ログイン
  "screens/no02_register.js", // No2  新規会員登録
  "screens/no09_reset.js", // No9  パスワード再設定
  "screens/no10_mail_sent.js", // No10 メール送信完了
  "screens/no03_calendar.js", // No3  カレンダー
  "screens/no08_year.js", // No8  年間カレンダー
  "screens/no14_autodelete.js", // No14 自動削除
  "screens/no11_12_notice.js", // No11 お知らせ・No12 ログイン時のお知らせ
  "screens/no06_07_13_confirm.js", // No6・No7・No13 確認ダイアログ
  "screens/no05_member_form.js", // No5  メンバー登録・編集
  "screens/no04_schedule.js", // No4  予定登録
];

// 見た目を1つずつ順番に読み込む（読み込み終わってから次へ）
function loadStyle(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = () => reject(new Error(`${href} を読み込めませんでした`));
    document.head.appendChild(link);
  });
}

// 画面の HTML を読み込む（キャッシュは使わず、いつも最新を読む）
async function loadScreens() {
  const layerEl = document.getElementById("layer");
  for (const path of SCREEN_HTML) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${path} を読み込めませんでした（${res.status}）`);
    layerEl.insertAdjacentHTML("beforebegin", await res.text());
  }
}

// 処理を1つずつ順番に読み込む（前のファイルの読み込みが終わってから次へ）
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`${src} を読み込めませんでした`));
    document.body.appendChild(s);
  });
}

// 起動：メールのリンク（?reset=…）から来たら再設定を優先。
// それ以外は、Cookie が有効ならそのままログイン状態に戻す
function boot() {
  startFromResetLink().then((fromLink) => {
    if (fromLink) return;
    api("GET", "/api/auth/me")
      .then((r) => {
        if (r.ok) signedIn(r.data);
      })
      .catch(() => {});
  });
}

(async () => {
  try {
    for (const href of STYLES) await loadStyle(href);
    await loadScreens();
    for (const src of SCRIPTS) await loadScript(src);
    boot();
  } catch (e) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<p style="margin:16px;color:#b42318">画面を読み込めませんでした：${e.message}</p>`,
    );
    console.error(e);
  }
})();
