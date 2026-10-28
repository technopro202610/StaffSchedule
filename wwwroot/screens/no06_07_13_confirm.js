/* =========================================================
   No6・No7・No13 確認ダイアログ（はい・いいえ）
     No6  スタンバイ期間外へ変更（期間中の欄の「スタンバイ期間外」ボタン）
     No7  スタンバイ期間中へ変更（期間外の欄の「スタンバイ期間中」ボタン）
     No13 メンバーの削除（メンバー一覧の「削除」ボタン）
   あわせて、期間外の欄の「カレンダーに表示」ボタンの処理もここに置く。
   メンバー一覧の☑は「選ぶ」だけ。変更はボタンを押したときに行う。
   ========================================================= */
"use strict";

// メンバー一覧で☑が入っているか（☑は画面を開いたときはいつも外れている）
function isSelected(member) {
  return !!state.sel[member.id];
}

// メンバー一覧の欄にいるメンバー（検索で絞り込んだあと）
//   sectionKey … "act"＝スタンバイ期間中の欄、"ina"＝スタンバイ期間外の欄
function sectionMembers(sectionKey) {
  return filtered().filter((member) => {
    if (sectionKey === "act") {
      return isActive(member);
    }
    return !isActive(member);
  });
}

// ---------------------------------------------------------
//  「カレンダーに表示」ボタン（期間外の欄）
//  ☑した人だけをカレンダーに出す（☑していない人は出さない）。反映したら☑は外す。
//  だれにも☑がないときは、この欄の全員をカレンダーから外す。
// ---------------------------------------------------------
function applyCal(sectionKey) {
  const members = sectionMembers(sectionKey);
  const chosenCount = members.filter(isSelected).length;

  members.forEach((member) => {
    state.pick[member.id] = isSelected(member);
    delete state.sel[member.id];
  });
  persist();
  render();

  if (chosenCount > 0) {
    toast(`${chosenCount}名をカレンダーに表示しました`);
  } else {
    toast("この欄のメンバーをカレンダーから外しました");
  }
}

// ---------------------------------------------------------
//  No6・No7：☑した人を「スタンバイ期間外」または「スタンバイ期間中」に変えてよいか確認する
//    sectionKey … "act"（期間中の欄 → 期間外へ）、"ina"（期間外の欄 → 期間中へ）
// ---------------------------------------------------------
function askStandby(sectionKey) {
  const toInactive = sectionKey === "act";
  const newStateName = toInactive ? "スタンバイ期間外" : "スタンバイ期間中";
  const targets = sectionMembers(sectionKey).filter(isSelected);

  if (targets.length === 0) {
    toast(`${newStateName}にするメンバーに☑を入れてください`);
    return;
  }

  openLayer(`<div class="scrim"><div class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="cfMsg">
    <div class="body"><p class="confirm-msg" id="cfMsg">${newStateName}へ変更しますか？</p><p class="confirm-sub">対象：☑が入っている ${targets.length}名</p></div>
    <footer><span class="grow"></span><button type="button" class="btn" data-close>いいえ</button><button type="button" class="btn btn-primary" id="cfYes">はい</button></footer>
  </div></div>`);
  getElement("#cfYes").focus();

  // 「はい」
  getElement("#cfYes").addEventListener("click", () => {
    targets.forEach((member) => {
      if (toInactive) {
        // 期間外にした日を覚えておく（ここから6か月を数え始める：No14 自動削除）
        state.inactive[member.id] = { since: toDateText(TODAY) };
      } else {
        delete state.inactive[member.id];
      }
      // カレンダーの表示は、決まりどおり（期間中＝出す／期間外＝出さない）に戻す
      delete state.pick[member.id];
      delete state.sel[member.id];
    });
    persist();
    closeLayer();
    render();
    toast(`${targets.length}名を${newStateName}にしました`);
  });
}

// ---------------------------------------------------------
//  No13：「削除」ボタン
//  ☑が入っているメンバーを、確認のあと手動で削除する
// ---------------------------------------------------------
function askDelete() {
  const targets = MEMBERS.filter(isSelected);
  if (targets.length === 0) {
    toast("削除するメンバーに☑を入れてください");
    return;
  }

  // 削除するメンバーの名前の一覧
  const nameList = targets.map((member) => `<li>${escapeHtml(member.name)}</li>`).join("");

  openLayer(`<div class="scrim"><div class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="cfMsg">
    <div class="body"><p class="confirm-msg" id="cfMsg">選択したメンバーを削除しますか？</p>
      <p class="confirm-sub">対象：☑が入っている ${targets.length}名</p>
      <ul class="del-names">${nameList}</ul>
      <p class="confirm-warn">削除すると、このメンバーの予定もすべて消え、元に戻せません。</p>
      </div>
    <footer><span class="grow"></span><button type="button" class="btn" data-close id="cfNo">いいえ</button><button type="button" class="btn btn-danger" id="cfYes">はい（削除する）</button></footer>
  </div></div>`);

  // 元に戻せない操作なので、「いいえ」を選んだ状態で開く
  getElement("#cfNo").focus();

  // 「はい（削除する）」
  getElement("#cfYes").addEventListener("click", () => {
    targets.forEach((member) => {
      removeMember(member, true); // true＝手動で削除（No14 の記録に「手動」と残る）
    });
    persist();
    closeLayer();
    render();
    toast(`${targets.length}名を削除しました`);
  });
}
