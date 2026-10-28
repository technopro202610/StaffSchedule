/* =========================================================
   No6・No7・No13 確認ダイアログ
   No6 期間外へ変更・No7 期間中へ変更（askStandby）、No13 メンバー削除（askDelete）。
   ========================================================= */
"use strict";

/* ---------- スタンバイ期間外（非表示）の一括設定 ---------- */
// メンバー一覧の☑は「選択」だけ。ボタンを押したときに反映する
//   ①「カレンダーに表示」：その欄で☑した人だけをカレンダーに出す（☑を外した人は出さない）
//   ②「スタンバイ期間外」「スタンバイ期間中」：その欄で☑した人の状態を切り替える（はい・いいえで確認）
const selOf=m=>!!S.sel[m.id]; // ☑は表示したときはいつも外れている（選んだ人だけ☑）
function sectionMembers(k){return filtered().filter(m=>k==="act"?isActive(m):!isActive(m));}
function applyCal(k){
  const list=sectionMembers(k),chosen=list.filter(selOf);
  // ☑した人だけをカレンダーに出す（この欄の☑していない人は出さない）。反映したら☑は外す
  //   だれにも☑がないときは、この欄の全員をカレンダーから外す
  list.forEach(m=>{S.pick[m.id]=selOf(m);delete S.sel[m.id];});
  persist();render();toast(chosen.length?`${chosen.length}名をカレンダーに表示しました`:"この欄のメンバーをカレンダーから外しました");
}
function askStandby(k){
  const toOut=k==="act",word=toOut?"スタンバイ期間外":"スタンバイ期間中";
  const targets=sectionMembers(k).filter(selOf);
  if(!targets.length){toast(`${word}にするメンバーに☑を入れてください`);return;}
  openLayer(`<div class="scrim"><div class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="cfMsg">
    <div class="body"><p class="confirm-msg" id="cfMsg">${word}へ変更しますか？</p><p class="confirm-sub">対象：☑が入っている ${targets.length}名</p></div>
    <footer><span class="grow"></span><button type="button" class="btn" data-close>いいえ</button><button type="button" class="btn btn-primary" id="cfYes">はい</button></footer>
  </div></div>`);
  $("#cfYes").focus();
  $("#cfYes").addEventListener("click",()=>{
    targets.forEach(m=>{if(toOut)S.inactive[m.id]={since:ymd(TODAY)};else delete S.inactive[m.id]; // 期間外は、期間外にした日から数え始める
      delete S.pick[m.id];delete S.sel[m.id];}); // カレンダーの表示は既定（期間中＝あり／期間外＝なし）に戻す
    persist();closeLayer();render();toast(`${targets.length}名を${word}にしました`);});
}


// 「削除」ボタン：メンバー一覧で☑が入っているメンバーを、確認のあと手動で削除する
function askDelete(){
  const checked=MEMBERS.filter(selOf);
  if(!checked.length){toast("削除するメンバーに☑を入れてください");return;}
  const targets=checked.filter(m=>m.id!==S.user); // ログイン中の本人は削除しない
  if(!targets.length){toast("ログイン中のご本人は削除できません");return;}
  const skip=checked.length-targets.length;
  openLayer(`<div class="scrim"><div class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="cfMsg">
    <div class="body"><p class="confirm-msg" id="cfMsg">選択したメンバーを削除しますか？</p>
      <p class="confirm-sub">対象：☑が入っている ${targets.length}名</p>
      <ul class="del-names">${targets.map(m=>`<li>${esc(m.name)}</li>`).join("")}</ul>
      <p class="confirm-warn">削除すると、このメンバーの予定もすべて消え、元に戻せません。</p>
      ${skip?`<p class="confirm-sub">※ ログイン中のご本人は削除の対象から外しています。</p>`:""}</div>
    <footer><span class="grow"></span><button type="button" class="btn" data-close id="cfNo">いいえ</button><button type="button" class="btn btn-danger" id="cfYes">はい（削除する）</button></footer>
  </div></div>`);
  $("#cfNo").focus(); // 元に戻せない操作なので「いいえ」を選んだ状態で開く
  $("#cfYes").addEventListener("click",()=>{
    targets.forEach(m=>removeMember(m,true));
    persist();closeLayer();render();toast(`${targets.length}名を削除しました`);});
}
