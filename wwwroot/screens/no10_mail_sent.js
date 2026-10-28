/* =========================================================
   No10 メール送信完了画面
   この画面を表示するのは No9 の「送信する」（screens/no09_reset.js）。
   ここでは、この画面にある2つのボタンの動きだけを決める。
   ========================================================= */
"use strict";

// 「ログイン画面に戻る」ボタン
getElement("#fsBack").addEventListener("click", () => {
  backToLogin();
});

// 「メールアドレスを入力し直す」リンク → パスワード再設定の申請画面（No9 ①）へ
getElement("#fsRetry").addEventListener("click", () => {
  openForgot();
});
