/* =========================================================
   No1 ログイン画面
   ・「パスワードを表示」のチェック
   ・「ログイン」ボタン（サーバーで照合 → 成功したらカレンダーへ）
   ・「ログアウト」ボタン（カレンダー画面の右上）
   ・ログインに成功したあとの処理（signedIn → enterApp）
   使う API：POST /api/auth/login、POST /api/auth/logout（C#：LoginController）
   ========================================================= */
"use strict";

// ログインID（メールアドレス）の入力欄。No2・No9 の画面からも使う
const loginUser = getElement("#loginUser");

// ---------------------------------------------------------
//  「パスワードを表示」のチェック
//  チェックあり → 文字で表示、チェックなし → ●●● で隠す
// ---------------------------------------------------------
getElement("#showPw").addEventListener("change", (event) => {
  const passwordInput = getElement("#loginPw");
  if (event.target.checked) {
    passwordInput.type = "text";
  } else {
    passwordInput.type = "password";
  }
});

// ---------------------------------------------------------
//  「ログイン」ボタン（フォームの送信）
// ---------------------------------------------------------
getElement("#loginForm").addEventListener("submit", async (event) => {
  // フォームの送信で画面が読み込み直されないようにする
  event.preventDefault();

  const errorMessage = getElement("#loginErr");
  getElement("#loginOk").hidden = true; // 「登録しました」などの緑のメッセージは消す

  // 1. 入力された値を取り出す（メールアドレスは前後の空白を取り、小文字にそろえる）
  const email = loginUser.value.trim().toLowerCase();
  const password = getElement("#loginPw").value;

  // 2. 空のときは、サーバーに送らずにエラーを出す
  if (email === "" || password === "") {
    errorMessage.textContent = "ID（メールアドレス）とパスワードを入力してください。";
    errorMessage.hidden = false;
    // 空の欄にカーソルを移す
    if (email === "") {
      loginUser.focus();
    } else {
      getElement("#loginPw").focus();
    }
    return;
  }

  // 3. サーバーで照合する（成功するとサーバーが Cookie を発行し、ログイン状態になる）
  //    処理中にボタンを何度も押されないよう、押せなくしておく
  const button = event.submitter || getElement("#loginForm button[type=submit]");
  button.disabled = true;
  try {
    const response = await api("POST", "/api/auth/login", { email: email, password: password });

    if (!response.ok) {
      // 失敗：サーバーが返したメッセージ（なければ決まりの文）を出す
      const serverMessage = response.data && response.data.message;
      errorMessage.textContent =
        serverMessage || "ログインできませんでした。時間をおいてもう一度お試しください。";
      errorMessage.hidden = false;
      return;
    }

    // 成功：エラーを消し、パスワード欄を空にしてカレンダーへ
    errorMessage.hidden = true;
    getElement("#loginPw").value = "";
    signedIn(response.data);
  } catch (error) {
    // サーバーに届かなかった（C# のプログラムが起動していない など）
    errorMessage.textContent =
      "サーバーに接続できません。バックエンドが起動しているか確認してください。";
    errorMessage.hidden = false;
  } finally {
    // 成功しても失敗しても、最後にボタンを押せる状態に戻す
    button.disabled = false;
  }
});

// ---------------------------------------------------------
//  ログインに成功したとき（ログイン直後と、画面を開き直して Cookie が有効だったとき）
//  ※ ログインする人（ユーザー）と、予定表に並ぶ人（メンバー）は別のもの。結び付けない。
//    ログインした人はメンバー一覧には入らない。
//    state.user には「ログイン中のユーザー」を表す ID を入れる（お知らせの既読の記録に使う）
// ---------------------------------------------------------
function signedIn(user) {
  state.user = "u" + user.userId;
  enterApp();
}

// ---------------------------------------------------------
//  ログイン後：カレンダー画面に入る
//  1. 削除日を過ぎたスタンバイ期間外のメンバーを自動で削除する（No14）
//  2. ログイン画面を隠して、カレンダーを表示する（No3）
//  3. 削除予定・削除したメンバーをポップアップでお知らせする（No12）
// ---------------------------------------------------------
function enterApp() {
  const deletedMembers = purgeExpired();

  getElement("#login").hidden = true;
  getElement("#app").hidden = false;
  render();
  showLoginNotice(deletedMembers);
}

// ---------------------------------------------------------
//  「ログアウト」ボタン（カレンダー画面の右上）
// ---------------------------------------------------------
getElement("#logoutBtn").addEventListener("click", () => {
  // サーバーに Cookie を消してもらう（結果は待たない。失敗しても画面はログアウトする）
  api("POST", "/api/auth/logout").catch(() => {});

  state.user = null;
  persist();

  // ログイン画面に戻す
  getElement("#loginPw").value = "";
  getElement("#app").hidden = true;
  showScreen("login");
  getElement("#loginOk").hidden = true;
  closeLayer();
});
