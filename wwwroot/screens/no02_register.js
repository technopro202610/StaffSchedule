/* =========================================================
   No2 新規会員登録画面
   ・ログイン画面の「新規登録」で開く
   ・入力チェック（画面）→ サーバーへ登録 → ログイン画面に戻る
   使う API：POST /api/auth/register（C#：RegisterController）
   ========================================================= */
"use strict";

// ---------------------------------------------------------
//  ログイン画面の「新規登録」→ この画面を開く
// ---------------------------------------------------------
getElement("#toReg").addEventListener("click", () => {
  // 前に入力した内容とエラーを消してから開く
  getElement("#regForm").reset();
  fieldErr("regName", "");
  fieldErr("regMail", "");
  fieldErr("regPw", "");
  fieldErr("regPw2", "");

  showScreen("register");
  getElement("#regName").focus();
});

// 「ログイン画面に戻る」リンク
getElement("#toLogin").addEventListener("click", () => {
  showScreen("login");
});

// 「パスワードを表示」のチェック（2つのパスワード欄をまとめて切り替える）
getElement("#regShowPw").addEventListener("change", (event) => {
  const type = event.target.checked ? "text" : "password";
  getElement("#regPw").type = type;
  getElement("#regPw2").type = type;
});

// ---------------------------------------------------------
//  画面での入力チェック
//  エラーを { 入力欄のid: エラーの文 } の形で返す（エラーがない欄は ""）
// ---------------------------------------------------------
function checkRegisterInput(name, email, password, passwordConfirm) {
  const errors = { regName: "", regMail: "", regPw: "", regPw2: "" };

  // 名前
  if (name === "") {
    errors.regName = "名前を入力してください。";
  }

  // メールアドレス（○○@○○.○○ の形か）
  if (email === "") {
    errors.regMail = "メールアドレスを入力してください。";
  } else if (!isMail(email)) {
    errors.regMail = "メールアドレスの形式が正しくありません（例：yamada.taro@example.com）。";
  }

  // パスワード（8文字以上で、英字と数字を両方含む）
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (password === "") {
    errors.regPw = "パスワードを入力してください。";
  } else if (password.length < 8 || !hasLetter || !hasDigit) {
    errors.regPw = "8文字以上で、英字と数字を両方含めてください。";
  }

  // パスワード（確認）
  if (passwordConfirm === "") {
    errors.regPw2 = "確認のため、もう一度パスワードを入力してください。";
  } else if (passwordConfirm !== password) {
    errors.regPw2 = "上のパスワードと一致しません。";
  }

  return errors;
}

// ---------------------------------------------------------
//  エラーを入力欄の下に出し、最初のエラーの欄の id を返す（エラーがなければ null）
// ---------------------------------------------------------
function showFieldErrors(errors) {
  let firstErrorId = null;
  for (const id in errors) {
    fieldErr(id, errors[id]);
    if (errors[id] !== "" && firstErrorId === null) {
      firstErrorId = id;
    }
  }
  return firstErrorId;
}

// ---------------------------------------------------------
//  「登録する」ボタン（フォームの送信）
// ---------------------------------------------------------
getElement("#regForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  // 1. 入力された値を取り出す
  //    名前：前後の空白を取り、全角空白は半角に、続く空白は1つにする
  const name = getElement("#regName").value.trim().replace(/　/g, " ").replace(/\s+/g, " ");
  const email = getElement("#regMail").value.trim().toLowerCase();
  const password = getElement("#regPw").value;
  const passwordConfirm = getElement("#regPw2").value;

  // 2. 画面で入力チェック。エラーがあれば最初のエラーの欄にカーソルを移して終わり
  const errors = checkRegisterInput(name, email, password, passwordConfirm);
  const firstErrorId = showFieldErrors(errors);
  if (firstErrorId !== null) {
    getElement("#" + firstErrorId).focus();
    return;
  }

  // 3. サーバーへ登録する（メールアドレスの重複チェック・パスワードのハッシュ化・DB保存はサーバー側）
  const button = event.submitter || getElement("#regForm button[type=submit]");
  button.disabled = true;
  let response;
  try {
    response = await api("POST", "/api/auth/register", {
      name: name,
      email: email,
      password: password,
      passwordConfirm: passwordConfirm,
    });
  } catch (error) {
    fieldErr("regName", "サーバーに接続できません。バックエンドが起動しているか確認してください。");
    button.disabled = false;
    return;
  }
  button.disabled = false;

  // 4. 失敗したとき：サーバーのエラーを、対応する入力欄の下に出す
  if (!response.ok) {
    // サーバーのエラーのキー → 画面の入力欄の id
    const serverKeyToInputId = {
      name: "regName",
      email: "regMail",
      password: "regPw",
      passwordConfirm: "regPw2",
    };
    const serverErrors = (response.data && response.data.errors) || {};

    const errorsForScreen = {};
    for (const key in serverKeyToInputId) {
      errorsForScreen[serverKeyToInputId[key]] = serverErrors[key] || "";
    }
    let firstId = showFieldErrors(errorsForScreen);

    // どの欄のエラーでもないとき（サーバーの不具合など）は、名前の欄の下に出す
    if (firstId === null) {
      const serverMessage = response.data && response.data.message;
      fieldErr(
        "regName",
        serverMessage || "登録できませんでした。時間をおいてもう一度お試しください。",
      );
      firstId = "regName";
    }
    getElement("#" + firstId).focus();
    return;
  }

  // 5. 成功したとき：ログイン画面に戻り、メールアドレスを入れておく
  showScreen("login");
  loginUser.value = email;
  getElement("#loginPw").value = "";
  getElement("#loginErr").hidden = true;

  const okMessage = getElement("#loginOk");
  okMessage.textContent = `${name} さんを登録しました。パスワードを入力してログインしてください。`;
  okMessage.hidden = false;
  getElement("#loginPw").focus();
});
