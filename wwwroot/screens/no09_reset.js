/* =========================================================
   No9 パスワード再設定画面
   この画面は3つの部分に分かれています。
     ① 申請　　　　　　：メールアドレスを入れて「送信する」→ No10 メール送信完了へ
     ③ 新しいパスワード：メールのリンク（?reset=トークン）から開き、新しいパスワードを決める
     ④ リンクが無効　　：リンクの期限切れ・使用済みのとき
   使う API（C#：PasswordResetController）
     POST /api/auth/password-reset/request … ① メールを送ってもらう
     GET  /api/auth/password-reset/verify  … ③ を開く前に、リンクがまだ使えるか確かめる
     POST /api/auth/password-reset/confirm … ③ 新しいパスワードに変える
   ========================================================= */
"use strict";

// メールのリンクに付いていたトークン（③ で新しいパスワードを送るときに使う）
let resetToken = null;

// ---------------------------------------------------------
//  新しいパスワードのチェック
//  エラーを { rsPw: "…", rsPw2: "…" } の形で返す（エラーがない欄は ""）
// ---------------------------------------------------------
function pwErrors(password, passwordConfirm) {
  const errors = { rsPw: "", rsPw2: "" };

  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (password === "") {
    errors.rsPw = "新しいパスワードを入力してください。";
  } else if (password.length < 8 || !hasLetter || !hasDigit) {
    errors.rsPw = "8文字以上で、英字と数字を両方含めてください。";
  }

  if (passwordConfirm === "") {
    errors.rsPw2 = "確認のため、もう一度入力してください。";
  } else if (passwordConfirm !== password) {
    errors.rsPw2 = "上のパスワードと一致しません。";
  }

  return errors;
}

// ---------------------------------------------------------
//  ① 申請の画面を開く（ログイン画面の「パスワードを忘れた方」など）
// ---------------------------------------------------------
function openForgot() {
  getElement("#fgForm").reset();
  fieldErr("fgMail", "");

  // ログイン画面でメールアドレスを入力していれば、そのまま引き継ぐ
  const typedEmail = getElement("#loginUser").value.trim();
  if (typedEmail !== "") {
    getElement("#fgMail").value = typedEmail;
  }

  showScreen("forgot");
  getElement("#fgMail").focus();
}

// ---------------------------------------------------------
//  ③ 新しいパスワードの画面を開く
//    label … 「○○ さん」など、だれのパスワードかを表示する文字（なくてもよい）
// ---------------------------------------------------------
function openReset(label) {
  getElement("#rsForm").reset();
  fieldErr("rsPw", "");
  fieldErr("rsPw2", "");
  getElement("#rsErr").hidden = true;

  if (label) {
    getElement("#rsFor").textContent = `${label} の新しいパスワードを入力してください`;
  } else {
    getElement("#rsFor").textContent = "新しいパスワードを入力してください";
  }

  showScreen("reset");
  getElement("#rsPw").focus();
}

// ---------------------------------------------------------
//  ログイン画面に戻る
//    okMessage … 緑のメッセージ（例：「パスワードを変更しました…」）。なければ出さない
//    email     … ログインIDの欄に入れておくメールアドレス（なくてもよい）
// ---------------------------------------------------------
function backToLogin(okMessage, email) {
  showScreen("login");
  getElement("#loginErr").hidden = true;

  const okArea = getElement("#loginOk");
  okArea.textContent = okMessage || "";
  okArea.hidden = !okMessage;

  if (email) {
    getElement("#loginUser").value = email;
    getElement("#loginPw").value = "";
    getElement("#loginPw").focus();
  }
}

// ---------------------------------------------------------
//  ボタン・リンクの動き
// ---------------------------------------------------------
// ログイン画面の「パスワードを忘れた方」→ ① 申請
getElement("#forgotBtn").addEventListener("click", () => {
  openForgot();
});

// ① の「ログイン画面に戻る」
getElement("#fgBack").addEventListener("click", () => {
  backToLogin();
});

// ④ の「ログイン画面に戻る」
getElement("#riBack").addEventListener("click", () => {
  backToLogin();
});

// ④ の「再設定をやり直す」→ ① 申請
getElement("#riRetry").addEventListener("click", () => {
  openForgot();
});

// ③ の「パスワードを表示」のチェック（2つのパスワード欄をまとめて切り替える）
getElement("#rsShowPw").addEventListener("change", (event) => {
  const type = event.target.checked ? "text" : "password";
  getElement("#rsPw").type = type;
  getElement("#rsPw2").type = type;
});

// ---------------------------------------------------------
//  ① 「送信する」ボタン：再設定のメールを送ってもらう
// ---------------------------------------------------------
getElement("#fgForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  // 1. 入力チェック
  const email = getElement("#fgMail").value.trim().toLowerCase();
  let message = "";
  if (email === "") {
    message = "メールアドレスを入力してください。";
  } else if (!isMail(email)) {
    // 「\n」で改行し、例を2行目に出す（CSS の white-space: pre-line）
    message = "メールアドレスの形式が正しくありません。\n（例：taro.yamada@technopro.com）";
  }
  fieldErr("fgMail", message);
  if (message !== "") {
    getElement("#fgMail").focus();
    return;
  }

  // 2. サーバーへ申請する
  const button = event.submitter || getElement("#fgForm button[type=submit]");
  button.disabled = true;
  try {
    const response = await api("POST", "/api/auth/password-reset/request", { email: email });
    if (!response.ok) {
      const serverMessage = response.data && response.data.message;
      fieldErr(
        "fgMail",
        serverMessage || "送信できませんでした。時間をおいてもう一度お試しください。",
      );
      return;
    }

    // 3. No10 メール送信完了の画面へ
    //    サーバーは「登録されているか」にかかわらず同じ応答を返す（他人に知られないため）
    getElement("#fsTo").textContent = email;
    showScreen("forgotSent");
  } catch (error) {
    fieldErr("fgMail", "サーバーに接続できません。バックエンドが起動しているか確認してください。");
  } finally {
    button.disabled = false;
  }
});

// ---------------------------------------------------------
//  ③ 「パスワードを変更する」ボタン：新しいパスワードに変える
// ---------------------------------------------------------
getElement("#rsForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  // 1. 入力チェック。エラーがあれば最初のエラーの欄にカーソルを移して終わり
  const password = getElement("#rsPw").value;
  const passwordConfirm = getElement("#rsPw2").value;
  const errors = pwErrors(password, passwordConfirm);

  let firstErrorId = null;
  for (const id in errors) {
    fieldErr(id, errors[id]);
    if (errors[id] !== "" && firstErrorId === null) {
      firstErrorId = id;
    }
  }
  if (firstErrorId !== null) {
    getElement("#" + firstErrorId).focus();
    return;
  }

  // 2. サーバーへ送る
  const button = event.submitter || getElement("#rsForm button[type=submit]");
  button.disabled = true;
  const errorArea = getElement("#rsErr");
  try {
    const response = await api("POST", "/api/auth/password-reset/confirm", {
      token: resetToken,
      password: password,
      passwordConfirm: passwordConfirm,
    });

    // 410：リンクがもう使えない（期限切れ・使用済み）→ ④ リンクが無効
    if (response.status === 410) {
      showScreen("resetInvalid");
      return;
    }

    // そのほかのエラー：サーバーのエラーを入力欄の下に出す
    if (!response.ok) {
      const serverErrors = (response.data && response.data.errors) || {};
      fieldErr("rsPw", serverErrors.password || "");
      fieldErr("rsPw2", serverErrors.passwordConfirm || "");

      // どの欄のエラーでもないときは、フォームの下にまとめて出す
      if (!serverErrors.password && !serverErrors.passwordConfirm) {
        const serverMessage = response.data && response.data.message;
        errorArea.textContent = serverMessage || "変更できませんでした。";
        errorArea.hidden = false;
      }
      return;
    }

    // 3. 成功：使い終わったトークンを URL から消し、ログイン画面へ
    resetToken = null;
    history.replaceState(null, "", location.pathname);
    const changedEmail = response.data && response.data.email;
    backToLogin("パスワードを変更しました。新しいパスワードでログインしてください。", changedEmail);
  } catch (error) {
    errorArea.textContent =
      "サーバーに接続できません。バックエンドが起動しているか確認してください。";
    errorArea.hidden = false;
  } finally {
    button.disabled = false;
  }
});

// ---------------------------------------------------------
//  メールのリンク（http://…/?reset=トークン）から開かれたときの処理
//  js/app.js が起動するときに呼ぶ。
//  リンクから来たときは true、ふつうに開いたときは false を返す
// ---------------------------------------------------------
async function startFromResetLink() {
  const token = new URLSearchParams(location.search).get("reset");
  if (!token) {
    return false; // ふつうに開いた
  }

  resetToken = token;
  try {
    // リンクがまだ使えるか、サーバーに確かめる
    const response = await api(
      "GET",
      "/api/auth/password-reset/verify?token=" + encodeURIComponent(token),
    );
    if (response.ok) {
      // 使える → ③ を開く（名前があれば「○○ さん」、なければメールアドレスを出す）
      const data = response.data;
      let label = null;
      if (data) {
        label = data.name ? data.name + " さん" : data.email;
      }
      openReset(label);
    } else {
      showScreen("resetInvalid"); // もう使えない → ④
    }
  } catch (error) {
    showScreen("resetInvalid");
  }
  return true;
}
