/* =========================================================
   No5 メンバー登録・編集画面
   ========================================================= */
"use strict";

/* ---------- メンバーの追加・編集 ---------- */
const SYSTEMS=[{label:"標準勤務",s:"09:00",e:"18:00"},{label:"早番勤務",s:"08:30",e:"17:30"},{label:"遅番勤務",s:"10:00",e:"19:00"}];

function openMemberForm(mid){
  // mid なし＝追加、mid あり＝編集（名前・フリガナ・スタンバイ期間を変更できる）
  const m=mid?byId(mid):null;
  openLayer(`<div class="scrim"><form class="modal" id="mForm" role="dialog" aria-modal="true" aria-labelledby="mfTitle" novalidate>
    <header><div><h3 id="mfTitle">${m?"メンバーを編集":"メンバーを追加"}</h3><p>${m?"名前とふりがなを変更できます":"スケジュールに表示するメンバーを登録します"}</p></div></header>
    <div class="body mform">
      <div class="rfield"><label for="mfName">名前<span class="req">必須</span></label>
        <input id="mfName" class="input" type="text" maxlength="30" autocomplete="off" placeholder="例：山田 太郎" value="${m?esc(m.name):""}">
        <p class="ferr" id="mfName-err" hidden></p></div>
      <div class="rfield"><label for="mfKana">ふりがな<span class="req">必須</span></label>
        <input id="mfKana" class="input" type="text" maxlength="40" autocomplete="off" placeholder="例：やまだ たろう" value="${m?esc(toHira(m.kana||"")):""}">
        <small>ひらがなで入力してください（カタカナは自動でひらがなにします）。</small>
        <p class="ferr" id="mfKana-err" hidden></p></div>
    </div>
    <footer><span class="grow"></span><button type="button" class="btn" data-close>キャンセル</button><button class="btn btn-primary" type="submit" id="mfSave">${m?"保存":"追加する"}</button></footer>
  </form></div>`);
  $("#mfName").focus();
  $("#mfKana").addEventListener("blur",e=>{e.target.value=toHira(e.target.value);});
  $("#mForm").addEventListener("submit",e=>saveMember(e,m));
}
function saveMember(e,edit){
  e.preventDefault();
  // ふりがなは画面ではひらがな、内部（50音順の並べ替え）ではカタカナで持つ
  const name=spaces($("#mfName").value),hira=spaces(toHira($("#mfKana").value)),kana=toKata(hira);
  const errs={
    mfName:!name?"名前を入力してください。":"",
    mfKana:!hira?"ふりがなを入力してください。":!/^[ぁ-ゖー ]+$/.test(hira)?"ふりがなはひらがなで入力してください（例：やまだ たろう）。":"",
  };
  let first=null;for(const k in errs){fieldErr(k,errs[k]);if(errs[k]&&!first)first=k;}
  if(first){$("#"+first).focus();return;}
  // 同姓同名でも別のメンバーとして登録できる（名前の重複はチェックしない）
  if(edit){
    edit.name=name;edit.kana=kana;edit.teams=name;
    S.renamed[edit.id]={name,kana}; // 変更した名前を覚えておく（開き直しても残る）
    sortMembers();persist();closeLayer();
    render();toast(`${name} さんの情報を更新しました`);return;
  }
  // 勤務システムは標準勤務（9:00〜18:00）にする。表示色はフリガナの行で自動に決まる
  const sys=SYSTEMS[0];
  const m={id:"n"+Date.now().toString(36),name,kana,dept:"",teams:name,mail:"",sys:sys.label,sched:[sys.s,sys.e],registered:true,addedMember:true};
  S.members.push(m);MEMBERS.push(m);sortMembers();persist();closeLayer();
  S.q="";$("#searchInput").value="";render();
  const row=document.querySelector(`[data-member="${m.id}"]`);
  if(row){row.scrollIntoView({block:"nearest"});row.classList.add("flash");}
  toast(`${name} さんをメンバーに追加しました`);
}
