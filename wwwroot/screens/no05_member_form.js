/* =========================================================
   No5 メンバー登録・編集画面（ダイアログ）
   ・メンバー一覧の「追加」→ 新しいメンバーを追加する
   ・メンバー一覧の名前を押す → 名前・ふりがなを変更する
   ふりがなは、画面ではひらがなで見せ、内部（50音順の並べ替え）ではカタカナで持つ。
   ========================================================= */
"use strict";

// 勤務システムと所定時間（新しく追加したメンバーは、先頭の「標準勤務」にする）
const SYSTEMS = [
  { label: "標準勤務", s: "09:00", e: "18:00" },
  { label: "早番勤務", s: "08:30", e: "17:30" },
  { label: "遅番勤務", s: "10:00", e: "19:00" },
];

// ---------------------------------------------------------
//  ダイアログを開く
//    memberId なし → 追加、memberId あり → そのメンバーの編集
// ---------------------------------------------------------
function openMemberForm(memberId) {
  const member = memberId ? findMember(memberId) : null;
  const isEdit = member !== null;

  // 追加と編集で、文字を変える
  const title = isEdit ? "メンバーを編集" : "メンバーを追加";
  const description = isEdit
    ? "名前とふりがなを変更できます"
    : "スケジュールに表示するメンバーを登録します";
  const saveLabel = isEdit ? "保存" : "追加する";
  const nameValue = isEdit ? escapeHtml(member.name) : "";
  const kanaValue = isEdit ? escapeHtml(toHira(member.kana || "")) : "";

  openLayer(`<div class="scrim"><form class="modal" id="mForm" role="dialog" aria-modal="true" aria-labelledby="mfTitle" novalidate>
    <header><div><h3 id="mfTitle">${title}</h3><p>${description}</p></div></header>
    <div class="body mform">
      <div class="rfield"><label for="mfName">名前<span class="req">必須</span></label>
        <input id="mfName" class="input" type="text" maxlength="30" autocomplete="off" placeholder="例：山田 太郎" value="${nameValue}">
        <p class="ferr" id="mfName-err" hidden></p></div>
      <div class="rfield"><label for="mfKana">ふりがな<span class="req">必須</span></label>
        <input id="mfKana" class="input" type="text" maxlength="40" autocomplete="off" placeholder="例：やまだ たろう" value="${kanaValue}">
        <small>ひらがなで入力してください（カタカナは自動でひらがなにします）。</small>
        <p class="ferr" id="mfKana-err" hidden></p></div>
    </div>
    <footer><span class="grow"></span><button type="button" class="btn" data-close>キャンセル</button><button class="btn btn-primary" type="submit" id="mfSave">${saveLabel}</button></footer>
  </form></div>`);

  getElement("#mfName").focus();

  // ふりがなの欄を離れたら、カタカナをひらがなに直す
  getElement("#mfKana").addEventListener("blur", (event) => {
    event.target.value = toHira(event.target.value);
  });

  // 「追加する／保存」ボタン
  getElement("#mForm").addEventListener("submit", (event) => {
    saveMember(event, member);
  });
}

// ---------------------------------------------------------
//  入力チェック。エラーを { mfName: "…", mfKana: "…" } の形で返す（エラーがない欄は ""）
// ---------------------------------------------------------
function checkMemberInput(name, hiragana) {
  const errors = { mfName: "", mfKana: "" };

  if (name === "") {
    errors.mfName = "名前を入力してください。";
  }

  if (hiragana === "") {
    errors.mfKana = "ふりがなを入力してください。";
  } else if (!/^[ぁ-ゖー ]+$/.test(hiragana)) {
    // ひらがな・「ー」・空白だけ
    errors.mfKana = "ふりがなはひらがなで入力してください（例：やまだ たろう）。";
  }

  return errors;
}

// ---------------------------------------------------------
//  「追加する／保存」ボタン
//    editingMember … 編集中のメンバー（追加のときは null）
// ---------------------------------------------------------
function saveMember(event, editingMember) {
  event.preventDefault();

  // 1. 入力された値（空白をそろえる。ふりがなはひらがなにそろえ、内部用にカタカナも作る）
  const name = spaces(getElement("#mfName").value);
  const hiragana = spaces(toHira(getElement("#mfKana").value));
  const katakana = toKata(hiragana);

  // 2. 入力チェック。エラーがあれば最初のエラーの欄にカーソルを移して終わり
  const errors = checkMemberInput(name, hiragana);
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

  // 同姓同名でも、別のメンバーとして登録できる（名前の重複はチェックしない）

  // 3-A. 編集のとき：名前とふりがなを書き換える
  if (editingMember) {
    editingMember.name = name;
    editingMember.kana = katakana;
    editingMember.teams = name;
    state.renamed[editingMember.id] = { name: name, kana: katakana }; // 開き直しても残るよう覚えておく
    sortMembers();
    persist();
    closeLayer();
    render();
    toast(`${name} さんの情報を更新しました`);
    return;
  }

  // 3-B. 追加のとき：新しいメンバーを作る（勤務システムは標準勤務。アイコンの色はふりがなの行で決まる）
  const workSystem = SYSTEMS[0];
  const newMember = {
    id: "n" + Date.now().toString(36), // 重ならないID（今の時刻から作る）
    name: name,
    kana: katakana,
    dept: "",
    teams: name,
    mail: "",
    sys: workSystem.label,
    sched: [workSystem.s, workSystem.e],
    registered: true,
    addedMember: true,
  };
  state.members.push(newMember);
  MEMBERS.push(newMember);
  sortMembers();
  persist();
  closeLayer();

  // 検索を空にしてから描き直す（追加した人が一覧に必ず出るように）
  state.q = "";
  getElement("#searchInput").value = "";
  render();

  // 追加した人の行までスクロールして、少しの間光らせる
  const row = document.querySelector(`[data-member="${newMember.id}"]`);
  if (row) {
    row.scrollIntoView({ block: "nearest" });
    row.classList.add("flash");
  }
  toast(`${name} さんをメンバーに追加しました`);
}
